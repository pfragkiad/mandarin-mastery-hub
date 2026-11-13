// Pinyin pages: the Sound chart (/pinyin) and the three quiz games (Tone quiz,
// Sound-alikes, Type what you hear) are separate routes sharing one shell. The
// shell loads the syllable inventory and recordings lazily, shows the heading,
// source note and browser-remembered progress. The pages are reached from the
// side menu (Sound chart under Learn, the quizzes under Pinyin games), so the
// chart carries no quiz tab row; only phones show the five-game pill row on a
// quiz page. Inputs:
// the route's search values and navigation callbacks. State: the loaded data,
// progress and the shared player; the slow switch writes the global "Slower
// pronunciation" preference.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allSounds, IncompletePinyinDataError, loadPinyinData, type PinyinData, type Tone } from '@/lib/pinyin-guide';
import { progressSummary } from '@/lib/pinyin-progress';
import { useWorkspace } from './workspace';
import { SourceInfo } from './source-info';
import { useOneLineTitle } from './one-line-title';
import { PinyinChart, type ChartFilters } from './pinyin-chart';
import { SoundAlikeDrill, ToneDrill, TypeDrill, type DrillFilters, type DrillMode } from './pinyin-drills';
import { usePinyinPlayer, usePinyinProgress, type PinyinPlayer } from './pinyin-shared';
import { GameTabs } from './game-tabs';
import type { PinyinProgress } from '@/lib/pinyin-progress';

export type PinyinMode = 'chart' | DrillMode;
const headings: Record<PinyinMode, string> = { chart: 'Every sound of Mandarin.', tones: 'Hear the tone.', alikes: 'Tell sound-alikes apart.', type: 'Write what you hear.' };

/** Everything a mode page needs from the shell: loaded data, progress, player and the slow preference. */
type PinyinContext = { data: PinyinData; progress: PinyinProgress; record: (id: string, action: 'right' | 'wrong' | 'heard') => void; player: PinyinPlayer; slow: boolean; onSlow: (slow: boolean) => void };

function PinyinShell({ mode, children }: { mode: PinyinMode; children: (ctx: PinyinContext) => ReactNode }) {
  const { preferences, setPreferences } = useWorkspace();
  const [data, setData] = useState<PinyinData | null>(null);
  // failed: 'load' = sidecars couldn't be fetched; 'stale' = recording list doesn't cover the inventory (reload needed).
  const [failed, setFailed] = useState<false | 'load' | 'stale'>(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setFailed(false); loadPinyinData().then(d => { if (live) setData(d); }, error => { if (live) { setData(null); setFailed(error instanceof IncompletePinyinDataError ? 'stale' : 'load'); } }); return () => { live = false; }; }, [attempt]);
  const { progress, record, reset } = usePinyinProgress();
  const player = usePinyinPlayer(data, preferences.slow, id => record(id, 'heard'));
  const [confirming, setConfirming] = useState(false);
  // The title must stay on one line at every width; the hook lowers its font size as needed.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, headings[mode]);
  const onSlow = (slow: boolean) => setPreferences({ ...preferences, slow });
  const total = data ? allSounds(data).length : 0;
  const summary = progressSummary(progress, total);

  return <div className="page-enter library-page pinyin-page">
    <div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">PINYIN · 拼音 · LISTEN, COMPARE, REPEAT</div><h1 ref={titleRef}>{headings[mode]}{data && <SourceInfo inline className="detail-footnote pinyin-source">
        Recordings · <a href={data.audioSource.url} target="_blank" rel="noreferrer">audio-cmn{data.audioSource.commit ? ` (${String(data.audioSource.commit).slice(0, 7)})` : ''}</a> · {data.audioSource.license}<br/>
        {data.audioSource.credits}<br/>
        {data.audioSource.accent} · not listening-reviewed<br/>
        Neutral-tone recordings withdrawn by the source<br/>
        Syllables and tones · <a href={data.inventorySource.url} target="_blank" rel="noreferrer">CC-CEDICT</a> · {data.inventorySource.license}
      </SourceInfo>}</h1></div>
      {data && <div className="pinyin-progress" aria-label="Your progress">
        <span><strong>{summary.practised.toLocaleString('en-US')}</strong> of {total.toLocaleString('en-US')} sounds practised{summary.review ? <> · <strong className="pinyin-review-count">{summary.review}</strong> to review</> : null}</span>
        {summary.practised > 0 && (confirming
          ? <span className="pinyin-reset-confirm" role="group" aria-label="Confirm progress reset">Clear it?<Button size="sm" variant="outline" onClick={() => { reset(); setConfirming(false); }}>Clear progress</Button><Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button></span>
          : <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}><RotateCcw />Reset progress</Button>)}
      </div>}
    </div>
    {/* In a quiz the five-game pill row (phone only) switches games, since the
        phone Games tab covers all five; wider screens use the side menu. */}
    {mode !== 'chart' && <GameTabs current={mode} onBeforeNavigate={() => player.stop()}/>}
    <div className="pinyin-body">
      {failed === 'stale' ? <div className="record-gap pinyin-absent"><p>This page is holding an out-of-date list of recordings. <Button variant="link" size="sm" onClick={() => window.location.reload()}>Reload the page</Button></p></div>
      : failed ? <div className="record-gap pinyin-absent"><p>The pronunciation guide couldn’t load. <Button variant="link" size="sm" onClick={() => setAttempt(a => a + 1)}>Try again</Button></p></div>
        : !data ? <p className="library-note">Loading sounds…</p>
        : children({ data, progress, record, player, slow: preferences.slow, onSlow })}
    </div>
  </div>;
}

/** Sound chart page (/pinyin): syllable and tone stay in URL search (s, t). */
export function PinyinChartPage({ selected, tone, filters, onSelect, onTone, onFilters }: {
  selected?: string | undefined; tone: Tone | null; filters: ChartFilters;
  onSelect: (base: string | undefined, tone?: Tone) => void; onTone: (tone: Tone | undefined) => void; onFilters: (f: ChartFilters, pick?: { base: string; tone: Tone }) => void;
}) {
  return <PinyinShell mode="chart">{ctx => <PinyinChart data={ctx.data} progress={ctx.progress} player={ctx.player} filters={filters} selected={selected} tone={tone} slow={ctx.slow} onSlow={ctx.onSlow} onSelect={onSelect} onTone={onTone} onFilters={onFilters} />}</PinyinShell>;
}

/** One quiz game page (/pinyin/tone-quiz, /pinyin/sound-alikes, /pinyin/type-what-you-hear). */
export function PinyinDrillPage({ mode, filters, onFilters }: {
  mode: DrillMode; filters: DrillFilters; onFilters: (f: DrillFilters) => void;
}) {
  return <PinyinShell mode={mode}>{ctx => {
    const drillProps = { data: ctx.data, progress: ctx.progress, record: ctx.record, player: ctx.player, filters, onFilters, slow: ctx.slow, onSlow: ctx.onSlow };
    return mode === 'tones' ? <ToneDrill key="tones" {...drillProps} />
      : mode === 'alikes' ? <SoundAlikeDrill key="alikes" {...drillProps} />
      : <TypeDrill key="type" {...drillProps} />;
  }}</PinyinShell>;
}
