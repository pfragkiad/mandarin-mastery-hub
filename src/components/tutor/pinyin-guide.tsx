// Pinyin guide page: loads the syllable inventory and recordings lazily, then
// shows one of four URL-backed modes (Sound chart, Tone quiz, Sound-alikes,
// Type what you hear). Inputs: the route's search values and navigation
// callbacks. State: the loaded data, browser-remembered progress and the shared
// player; the slow switch writes the global "Slower pronunciation" preference.
import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { allSounds, loadPinyinData, type PinyinData } from '@/lib/pinyin-guide';
import { progressSummary } from '@/lib/pinyin-progress';
import { useWorkspace } from './workspace';
import { PinyinChart, type ChartFilters } from './pinyin-chart';
import { SoundAlikeDrill, ToneDrill, TypeDrill, type DrillFilters, type DrillMode } from './pinyin-drills';
import { usePinyinPlayer, usePinyinProgress } from './pinyin-shared';

export type PinyinMode = 'chart' | DrillMode;
export const PINYIN_MODES: { mode: PinyinMode; label: string }[] = [
  { mode: 'chart', label: 'Sound chart' },
  { mode: 'tones', label: 'Tone quiz' },
  { mode: 'alikes', label: 'Sound-alikes' },
  { mode: 'type', label: 'Type what you hear' },
];
const headings: Record<PinyinMode, string> = { chart: 'Every sound of Mandarin.', tones: 'Hear the tone.', alikes: 'Tell sound-alikes apart.', type: 'Write what you hear.' };

export function PinyinGuidePage({ mode, selected, chartFilters, drillFilters, onMode, onSelect, onChartFilters, onDrillFilters }: {
  mode: PinyinMode; selected?: string; chartFilters: ChartFilters; drillFilters: DrillFilters;
  onMode: (mode: PinyinMode) => void; onSelect: (base: string | undefined) => void; onChartFilters: (f: ChartFilters) => void; onDrillFilters: (f: DrillFilters) => void;
}) {
  const { preferences, setPreferences } = useWorkspace();
  const [data, setData] = useState<PinyinData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setFailed(false); loadPinyinData().then(d => { if (live) setData(d); }, () => { if (live) setFailed(true); }); return () => { live = false; }; }, [attempt]);
  const { progress, record, reset } = usePinyinProgress();
  const player = usePinyinPlayer(data, preferences.slow, id => record(id, 'heard'));
  const [confirming, setConfirming] = useState(false);
  const onSlow = (slow: boolean) => setPreferences({ ...preferences, slow });
  const total = data ? allSounds(data).length : 0;
  const summary = progressSummary(progress, total);
  const drillProps = data && { data, progress, record, player, filters: drillFilters, onFilters: onDrillFilters, slow: preferences.slow, onSlow };

  return <div className="page-enter library-page pinyin-page">
    <div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">PINYIN · 拼音 · LISTEN, COMPARE, REPEAT</div><h1>{headings[mode]}</h1></div>
      {data && <div className="pinyin-progress" aria-label="Your progress">
        <span><strong>{summary.practised.toLocaleString('en-US')}</strong> of {total.toLocaleString('en-US')} sounds practised{summary.review ? <> · <strong className="pinyin-review-count">{summary.review}</strong> to review</> : null}</span>
        {summary.practised > 0 && (confirming
          ? <span className="pinyin-reset-confirm" role="group" aria-label="Confirm progress reset">Clear it?<Button size="sm" variant="outline" onClick={() => { reset(); setConfirming(false); }}>Clear progress</Button><Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button></span>
          : <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}><RotateCcw />Reset progress</Button>)}
      </div>}
    </div>
    <Tabs className="catalog-tabs pinyin-tabs" value={mode} onValueChange={value => { const next = PINYIN_MODES.find(m => m.mode === value); if (next) { player.stop(); onMode(next.mode); } }}>
      <TabsList>{PINYIN_MODES.map(m => <TabsTrigger key={m.mode} value={m.mode}>{m.label}</TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="pinyin-body">
      {failed ? <div className="record-gap pinyin-absent"><p>The pronunciation guide couldn’t load. <Button variant="link" size="sm" onClick={() => setAttempt(a => a + 1)}>Try again</Button></p></div>
        : !data || !drillProps ? <p className="library-note">Loading sounds…</p>
        : mode === 'chart' ? <PinyinChart data={data} progress={progress} player={player} filters={chartFilters} selected={selected} slow={preferences.slow} onSlow={onSlow} onSelect={onSelect} onFilters={onChartFilters} />
        : mode === 'tones' ? <ToneDrill key="tones" {...drillProps} />
        : mode === 'alikes' ? <SoundAlikeDrill key="alikes" {...drillProps} />
        : <TypeDrill key="type" {...drillProps} />}
    </div>
    {data && <p className="source-note library-source-note pinyin-source">
      Recordings: <a href={data.audioSource.url} target="_blank" rel="noreferrer">audio-cmn{data.audioSource.commit ? ` (${String(data.audioSource.commit).slice(0, 7)})` : ''}</a> · {data.audioSource.credits} · {data.audioSource.license} · {data.audioSource.accent} · not listening-reviewed · neutral-tone recordings withdrawn by the source.{' '}
      Syllables and tones: <a href={data.inventorySource.url} target="_blank" rel="noreferrer">CC-CEDICT</a> · {data.inventorySource.license}.
    </p>}
  </div>;
}
