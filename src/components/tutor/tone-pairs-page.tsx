// Pinyin sounds: the Tone pairs (/pinyin/tone-pairs) and Tone changes (/pinyin/tone-changes)
// pages, ported from the owner's prototype handoff (reports/pinyin-tone-pairs-frontend-handoff.md).
//
// Purpose: hear two-syllable words as whole-word recordings, grouped by dictionary tone pair
// (a 4 × 5 matrix, neutral second tone last) or by tone change (3 + 3, 一, 不).
// Inputs: `mode`, the route's validated search (pair or rule, exact example id, listen,
// speed) and `onChange(patch, replace)`, which the route turns into navigation. Choosing a
// cell, a rule or a word pushes history (Back restores it); Listen first and speed only
// replace the entry. State: the lazily loaded sidecar and the one playback status.
//
// Rules carried over from the handoff:
// - One speaker plays one exact whole-word recording (the word card's own CDN attachment) at
//   normal or 0.8× speed. No TTS, no syllable joining, no automatic fallback on failure.
// - Any selection change, page switch or unmount stops playback; Next word never autoplays.
// - The dictionary tones, the exact source reading and the *expected in speech* draft stay
//   separate; the draft is labelled as such and nothing here claims listening approval.
// - Listen first hides every word name and reading (cells, list, card) but keeps the
//   selected pair/rule visible: a shadowing aid, not a scored quiz.
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playRecordingAt, stopRecording, NORMAL_RATE, type RecordingSettle } from '@/lib/audio';
import { historyEntry, soundChartArrival, soundTrail } from '@/lib/detail-trail';
import { soundOrigin } from '@/lib/selection-scroll';
import { usePublishSections } from '@/lib/section-switch';
import { toneMark } from '@/lib/pinyin-guide';
import {
  DEFAULT_PAIR, DEFAULT_RULE, FIRST_TONES, RULE_ORDER, SECOND_TONES, SLOW_PLAYBACK_RATE, TONE_RULES,
  listeningTip, loadTonePairs, nextExample, pairLabel, pairPool, rulePool, selectedExample, toneLabel, tonesChanged,
  type TonePairData, type TonePairExample, type ToneRule, type ToneChangesSearch, type TonePairsSearch,
} from '@/lib/tone-pairs';
import { SourceInfo } from './source-info';
import { ToneContour } from './pinyin-shared';
import { useOneLineTitle } from './one-line-title';

export type ToneSoundsMode = 'pairs' | 'changes';
type Search = TonePairsSearch & ToneChangesSearch;
export type ToneSoundsPatch = { pair?: string | undefined; rule?: ToneRule | undefined; example?: string | undefined; listen?: true | undefined; speed?: 'slow' | undefined };

const headings: Record<ToneSoundsMode, string> = { pairs: 'Hear tones together.', changes: 'Hear tones change.' };
const intros: Record<ToneSoundsMode, string> = {
  pairs: 'Move from single sounds to the rhythm of real two-syllable words.',
  changes: 'Keep the dictionary reading. Hear what changes in context.',
};

/** Coloured tone number (neutral as a dot when compact). */
function ToneDigit({ tone, compact = false }: { tone: number; compact?: boolean }) {
  return <span className={`tone-pair-digit tone-${tone}`}>{tone === 5 ? (compact ? '·' : 'neutral') : tone}</span>;
}

type Status = { kind: 'idle' | 'loading' | 'playing' | 'finished' | 'error'; text: string };
const IDLE: Status = { kind: 'idle', text: '' };

export function ToneSoundsPage({ mode, search, onChange }: { mode: ToneSoundsMode; search: Search; onChange: (patch: ToneSoundsPatch, replace?: boolean) => void }) {
  const [data, setData] = useState<TonePairData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setFailed(false); loadTonePairs().then(d => { if (live) setData(d); }, () => { if (live) setFailed(true); }); return () => { live = false; }; }, [attempt]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, headings[mode]);

  const [status, setStatus] = useState<Status>(IDLE);
  // Each play gets a generation number; a settle from an older play is ignored.
  const generation = useRef(0);
  const stop = () => { generation.current += 1; stopRecording(); setStatus(IDLE); };
  // The header's Pinyin sounds switcher stops playback before changing page.
  usePublishSections('pinyin-sounds', null, { beforeSwitch: stop });

  const hidden = Boolean(search.listen);
  const slow = search.speed === 'slow';
  const pair = search.pair ?? DEFAULT_PAIR;
  const rule = search.rule ?? DEFAULT_RULE;
  const pool = data ? (mode === 'pairs' ? pairPool(data, pair) : rulePool(data, rule)) : [];
  const row = selectedExample(pool, search.example);

  // Any change of what is selected (or leaving the page) stops the current recording.
  const selectionKey = `${mode}|${pair}|${rule}|${row?.id ?? ''}`;
  useEffect(() => () => { generation.current += 1; stopRecording(); setStatus(IDLE); }, [selectionKey]);

  const play = async () => {
    if (!row) return;
    if (status.kind === 'loading' || status.kind === 'playing') { stop(); return; }
    const mine = ++generation.current;
    setStatus({ kind: 'loading', text: 'Loading recording…' });
    const onSettle = (how: RecordingSettle) => {
      if (mine !== generation.current) return;
      if (how === 'ended') setStatus({ kind: 'finished', text: 'Finished. Say it back, then replay when you’re ready.' });
      else if (how === 'failed') setStatus({ kind: 'error', text: 'The recording could not play. No other voice was used.' });
      else setStatus(IDLE);
    };
    const ok = await playRecordingAt(row.audio.url, slow ? SLOW_PLAYBACK_RATE : NORMAL_RATE, onSettle);
    if (ok && mine === generation.current) setStatus({ kind: 'playing', text: `Playing the whole-word recording · ${row.audio.speaker}${slow ? ' · 0.8× speed' : ''}` });
  };
  const playing = status.kind === 'loading' || status.kind === 'playing';

  return <div className="page-enter library-page pinyin-page tone-sounds-page">
    <div className="page-heading library-heading"><div>
      <div className="eyebrow library-eyebrow">PINYIN SOUNDS · {mode === 'pairs' ? 'TONE PAIRS' : 'TONE CHANGES'}</div>
      <h1 ref={titleRef}>{headings[mode]}{data && <SourceInfo inline className="detail-footnote pinyin-source">
        Whole-word recordings · {data.source.speaker} · {data.source.copyright} / Shtooka<br/>
        <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">{data.source.license}</a> · MP3 processing: {data.source.processingCredits}<br/>
        <a href={`${data.source.repository}/tree/${data.source.commit}`} target="_blank" rel="noreferrer">audio-cmn ({data.source.commit.slice(0, 7)})</a> · each the word card’s own recording, unchanged<br/>
        Dictionary and expected-in-speech labels are teaching drafts, not listening-reviewed<br/>
        0.8× slows the same recording in the browser; it is not a separate recording
      </SourceInfo>}</h1>
      <p>{intros[mode]}</p>
    </div></div>
    <p className="tone-sounds-draft"><strong>Draft labels.</strong> Real recordings by one speaker; the tone labels still await listening review.</p>
    {failed ? <div className="record-gap pinyin-absent"><p>The tone pairs couldn’t load. <Button variant="link" size="sm" onClick={() => setAttempt(a => a + 1)}>Try again</Button></p></div>
      : !data || !row ? <p className="library-note">Loading words…</p>
      : <div className="tone-sounds-layout">
        <div className="tone-sounds-main">
          {mode === 'pairs'
            ? <PairMatrix data={data} pair={pair} hidden={hidden} onPick={p => onChange({ pair: p, example: undefined })}/>
            : <RuleList rule={rule} onPick={r => onChange({ rule: r, example: undefined })}/>}
          <section className="tone-sounds-bank" aria-label={mode === 'pairs' ? 'Words in this pair' : 'Examples for this change'}>
            <h2 className="pinyin-group-title">{mode === 'pairs' ? <>Words in this pair <span>{pairLabel(pair)}</span></> : <>Examples <span>{TONE_RULES[rule].title}</span></>}</h2>
            <div className="tone-sounds-words">
              {pool.map((e, index) => <button key={e.id} type="button" className={`tone-sounds-word${e.id === row.id ? ' is-selected' : ''}`} aria-pressed={e.id === row.id} onClick={() => onChange({ example: e.id })}>
                {hidden ? <><span className="tone-sounds-word-hanzi" aria-hidden="true">••</span><span className="tone-sounds-word-reading">Recording {index + 1}</span></>
                  : <><span className="tone-sounds-word-hanzi" lang="zh-CN">{e.headword}</span><span className="tone-sounds-word-reading pinyin">{e.citationSyllables.join(' ')}</span></>}
              </button>)}
            </div>
          </section>
        </div>
        <PracticeCard row={row} pool={pool} mode={mode} hidden={hidden} slow={slow} playing={playing} status={status}
          onPlay={() => void play()}
          onNext={() => { const next = nextExample(pool, row.id); if (next) onChange({ example: next.id }); }}
          onReveal={() => onChange({ listen: hidden ? undefined : true }, true)}
          onSpeed={value => { stop(); onChange({ speed: value ? 'slow' : undefined }, true); }}/>
      </div>}
  </div>;
}

/** 4 × 5 grid of dictionary tone pairs; each cell shows its first word (hidden in Listen first). */
function PairMatrix({ data, pair, hidden, onPick }: { data: TonePairData; pair: string; hidden: boolean; onPick: (pair: string) => void }) {
  return <section className="tone-matrix-section" aria-label="Tone pairs">
    <h2 className="pinyin-group-title">Choose a tone pair <span>20 pairs · 40 words</span></h2>
    <p className="tone-sounds-helper">First tone down the side, second tone across the top.</p>
    <div className="tone-matrix" role="group" aria-label="Tone pairs by dictionary tones">
      <span className="tone-matrix-corner" aria-hidden="true"/>
      {SECOND_TONES.map(t => <span key={t} className={`tone-matrix-axis tone-${t}`}><ToneContour tone={t}/>{t === 5 ? 'Neutral' : `Tone ${t}`}</span>)}
      {FIRST_TONES.map(first => [
        <span key={`row-${first}`} className={`tone-matrix-axis is-row tone-${first}`}><ToneContour tone={first}/>{first}</span>,
        ...SECOND_TONES.map(second => {
          const key = `${first}-${second}`;
          const words = pairPool(data, key);
          return <button key={key} type="button" className={`tone-matrix-cell${pair === key ? ' is-selected' : ''}`} aria-pressed={pair === key} aria-label={`${pairLabel(key)}; ${words.length} words`} onClick={() => onPick(key)}>
            <span className="tone-matrix-code"><ToneDigit tone={first} compact/> + <ToneDigit tone={second} compact/></span>
            <span className="tone-matrix-word" lang="zh-CN">{hidden ? '••' : words[0]?.headword}</span>
          </button>;
        }),
      ])}
    </div>
    <p className="tone-sounds-helper"><strong>Dictionary tones stay visible.</strong> In the 3 + 3 cell, the first syllable normally rises in speech. A neutral ending has no fixed contour of its own.</p>
  </section>;
}

/** The three tone-change focus areas. */
function RuleList({ rule, onPick }: { rule: ToneRule; onPick: (rule: ToneRule) => void }) {
  return <section className="tone-rule-section" aria-label="Tone changes">
    <h2 className="pinyin-group-title">Common tone changes <span>3 focus areas</span></h2>
    <div className="tone-rule-list">
      {RULE_ORDER.map(id => { const r = TONE_RULES[id]; return <button key={id} type="button" className={`tone-rule${rule === id ? ' is-selected' : ''}`} aria-pressed={rule === id} onClick={() => onPick(id)}>
        <span className="tone-rule-symbol" lang={r.hanzi ? 'zh-CN' : undefined}>{r.symbol}</span>
        <span className="tone-rule-copy"><strong>{r.title}</strong><span>{r.description}</span><small>{r.short}</small></span>
      </button>; })}
    </div>
    <p className="tone-sounds-helper"><strong>Speech has context.</strong> A third tone often stays low before a non-third tone. Longer third-tone chains depend on phrasing. This small sample does not cover every exception or regional pattern.</p>
  </section>;
}

/** The selected word: face, tones, listening tip, playback, Sound chart links and source. */
function PracticeCard({ row, pool, mode, hidden, slow, playing, status, onPlay, onNext, onReveal, onSpeed }: {
  row: TonePairExample; pool: TonePairExample[]; mode: ToneSoundsMode; hidden: boolean; slow: boolean; playing: boolean; status: Status;
  onPlay: () => void; onNext: () => void; onReveal: () => void; onSpeed: (slow: boolean) => void;
}) {
  const changed = tonesChanged(row);
  // Sound chart links set the Sound card's Back step to this word (as glyph cards do).
  const rememberTrail = () => { soundTrail.replace({ label: row.headword, href: historyEntry(), lang: 'zh-CN' }); soundChartArrival.request(); soundOrigin.set(null); };
  return <section className="pinyin-player tone-sounds-card" aria-label="Selected recording">
    <div className="pinyin-player-head">
      <span className="eyebrow">{mode === 'pairs' ? 'Tone pair' : 'Tone change'} · {pool.findIndex(e => e.id === row.id) + 1} of {pool.length}</span>
      <Button variant="ghost" size="sm" className="tone-sounds-reveal" aria-pressed={hidden} onClick={onReveal}>{hidden ? 'Reveal word' : 'Listen first'}</Button>
    </div>
    {hidden
      ? <div className="tone-sounds-face is-hidden"><div className="tone-sounds-hanzi" aria-hidden="true">••</div><div className="tone-sounds-reading">Listen, then reveal</div><div className="tone-sounds-meaning">Say back what you hear.</div></div>
      : <div className="tone-sounds-face">
        <div className="tone-sounds-hanzi" lang="zh-CN">{row.headword}</div>
        <div className="tone-sounds-reading pinyin" title={changed ? 'Expected in speech · draft' : undefined}>{row.expectedSpokenSyllables.join(' ')}</div>
        <div className="tone-sounds-meaning">{row.english}</div>
      </div>}
    <dl className="tone-sounds-compare">
      <div><dt>Dictionary tones</dt><dd>{hidden ? 'Hidden' : toneLabel(row.citationTones)}</dd></div>
      <div className={changed && !hidden ? 'is-changed' : undefined}><dt>Expected in speech · draft</dt><dd>{hidden ? 'Hidden' : toneLabel(row.expectedSpokenTones)}</dd></div>
    </dl>
    <p className="pinyin-player-tip">{hidden ? 'Play the complete word. Reveal it when you’re ready to compare.' : listeningTip(row)}</p>
    <div className="tone-sounds-controls">
      <Button variant="outline" size="sm" className="tone-sounds-play" onClick={onPlay}>{playing ? <><Square/>Stop</> : <><Volume2/>Play recording</>}</Button>
      <Button variant="outline" size="sm" onClick={onNext}>Next word<ArrowRight/></Button>
    </div>
    <div className="tone-sounds-speed-row"><span>Speed</span>
      <div className="tone-sounds-speed" role="group" aria-label="Playback speed">
        <button type="button" aria-pressed={!slow} className={!slow ? 'is-current' : undefined} onClick={() => onSpeed(false)}>Normal</button>
        <button type="button" aria-pressed={slow} className={slow ? 'is-current' : undefined} onClick={() => onSpeed(true)}>0.8×</button>
      </div>
    </div>
    <p className={`tone-sounds-status${status.kind === 'error' ? ' pinyin-audio-error' : ''}`} role="status" aria-live="polite">{status.text}</p>
    {hidden ? <p className="tone-sounds-helper">Reveal the word to open its syllables.</p> : <>
      <div className="tone-sounds-links">
        <span className="eyebrow">Each dictionary sound</span>
        <div className="tone-sounds-chips">{row.chartLinks.map((l, i) => <Link key={`${l.base}${l.tone}-${i}`} to="/pinyin" search={{ s: l.base, t: l.tone }} className={`tone-sounds-chip tone-${l.tone}`} title={`Open ${toneMark(l.base, l.tone)} in Sound chart`}
          onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) rememberTrail(); }}>{l.reading}</Link>)}</div>
        {row.vocabularyEntryId && <Link to="/vocabulary" search={{ word: row.vocabularyEntryId }} className="tone-sounds-word-link">Open the word card<ArrowRight/></Link>}
      </div>
      {/* No per-word source footer: recording and licence details live only in the page title's (i). */}
    </>}
  </section>;
}
