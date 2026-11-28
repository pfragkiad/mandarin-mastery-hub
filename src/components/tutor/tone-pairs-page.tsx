// Pinyin sounds: the Tone pairs (/pinyin/tone-pairs) and Tone changes (/pinyin/tone-changes)
// pages, ported from the owner's prototype handoff (reports/pinyin-tone-pairs-frontend-handoff.md).
//
// Purpose: hear two-syllable words as whole-word recordings, grouped by dictionary tone pair
// (a 4 × 5 matrix, neutral second tone last) or by tone change (3 + 3, 一, 不).
// Inputs: `mode`, the route's validated search (pair or rule, exact example id, listen)
// and `onChange(patch, replace)`, which the route turns into navigation. Choosing a cell, a
// rule or a word pushes history (Back restores it); Listen first only replaces the entry.
// State: the lazily loaded sidecars (tone pairs; the Sound chart's syllable recordings for
// the chips) and the playback state, which stays silent: the card shows no loading/playing/
// finished label, only an error if a recording fails. Speed is the app-wide "Slower pronunciation"
// preference, as for every other speaker; the page has no speed control of its own.
//
// Rules carried over from the handoff:
// - The word speaker plays one exact whole-word recording (the word card's own CDN attachment);
//   each syllable chip plays only the Sound chart's own recording of that exact syllable + tone.
//   No TTS, no syllable joining, no automatic fallback on failure.
// - Any selection change, page switch or unmount stops playback; the word speaker and the
//   syllable chips are play-only (no stop state, no stop icon), like every other card in the app.
// - The dictionary tones, the exact source reading and the *expected in speech* draft stay
//   separate; the draft is labelled as such and nothing here claims listening approval.
// - Listen first hides every word name and reading (cells, list, card) but keeps the
//   selected pair/rule visible: a shadowing aid, not a scored quiz.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playRecordingAt, stopRecording, NORMAL_RATE, SLOW_RATE, type RecordingSettle } from '@/lib/audio';
import { words as vocabularyWords } from '@/lib/mandarin';
import { openDetailsHint } from '@/lib/tile-hints';
import { usePublishSections } from '@/lib/section-switch';
import { hasRecording, loadPinyinData, soundId, toneMark, type PinyinData, type Tone } from '@/lib/pinyin-guide';
import {
  DEFAULT_PAIR, DEFAULT_RULE, FIRST_TONES, RULE_ORDER, SECOND_TONES, TONE_RULES,
  loadTonePairs, matrixPairOrder, pairLabel, pairPool, rulePool, selectedExample, toneLabel, tonesChanged,
  type TonePairData, type TonePairExample, type ToneRule, type ToneChangesSearch, type TonePairsSearch,
} from '@/lib/tone-pairs';
import { SourceInfo } from './source-info';
import { ToneContour, usePinyinPlayer, sound, type PinyinPlayer } from './pinyin-shared';
import { SentenceHints } from './sentence-section';
import type { HintWord } from './lesson-hints';
import { useWorkspace } from './workspace';
import { useOneLineTitle } from './one-line-title';
import { ExpandableCharacterGrid } from './expandable-character-grid';
import { SmallGridMeaning } from './small-grid-meaning';
import { ExampleCardMeta } from './sentence-section';
import { ExamplePronunciation } from './example-pronunciation';
import { toneExamplesByHsk } from '@/lib/tone-pair-vocabulary';
import { wordHskPill } from './word-identity-pills';
import { UsageLabel } from './usage-label';
import { DetailSheet } from './detail-sheet';
import { detailTrail } from '@/lib/detail-trail';
import { SoundExampleGlyph } from './sound-example-glyph';

export type ToneSoundsMode = 'pairs' | 'changes';
type Search = TonePairsSearch & ToneChangesSearch;
export type ToneSoundsPatch = { pair?: string | undefined; rule?: ToneRule | undefined; example?: string | undefined; listen?: true | undefined };
/** The Sound chart recordings behind the card's syllable chips (lazy), and their player. */
type SyllableChips = { data: PinyinData | null; player: PinyinPlayer; error: string; onPlay: (base: string, tone: Tone) => void };

const headings: Record<ToneSoundsMode, string> = { pairs: 'Hear tones together.', changes: 'Hear tones change.' };
const intros: Record<ToneSoundsMode, string> = {
  pairs: 'Move from single sounds to the rhythm of real two-syllable words.',
  changes: 'Keep the dictionary reading. Hear what changes in context.',
};

/** Coloured tone number (neutral as a dot when compact). */
function ToneDigit({ tone, compact = false }: { tone: number; compact?: boolean }) {
  return <span className={`tone-pair-digit tone-${tone}`}>{tone === 5 ? (compact ? '·' : 'neutral') : tone}</span>;
}

// Playback state only. The card shows no text while a recording loads, plays or ends — every
// other card in the app is silent about it — so `kind` exists to keep the speaker play-only and
// the line below renders only for an error.
type Status = { kind: 'idle' | 'loading' | 'playing' | 'error'; text: string };
const IDLE: Status = { kind: 'idle', text: '' };

export function ToneSoundsPage({ mode, search, onChange }: { mode: ToneSoundsMode; search: Search; onChange: (patch: ToneSoundsPatch, replace?: boolean) => void }) {
  const [data, setData] = useState<TonePairData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Pair/rule selection opens the same top-anchored window as the Sound chart. Bare
  // page visits show the matrix or rules; direct word links and history restore the window.
  // Derived directly from URL search (never local state before navigation) so DetailSheet
  // mounts on the pushed history entry and never mistakes the page before the grid as its origin.
  const detailOpen = Boolean((mode === 'pairs' ? search.pair : search.rule) || search.example);
  useEffect(() => { let live = true; setFailed(false); loadTonePairs().then(d => { if (live) setData(d); }, () => { if (live) setFailed(true); }); return () => { live = false; }; }, [attempt]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, headings[mode]);

  const [status, setStatus] = useState<Status>(IDLE);
  // Each play gets a generation number; a settle from an older play is ignored.
  const generation = useRef(0);
  const stop = () => { generation.current += 1; chipStop.current(); stopRecording(); setStatus(IDLE); };
  // The header's Pinyin sounds switcher stops playback before changing page.
  usePublishSections('pinyin-sounds', null, { beforeSwitch: stop });

  const { preferences } = useWorkspace();
  const slow = preferences.slow;
  const hidden = Boolean(search.listen);
  // Syllable chips: the Sound chart's recordings, loaded lazily with the page.
  const [chartData, setChartData] = useState<PinyinData | null>(null);
  useEffect(() => { let live = true; loadPinyinData().then(d => { if (live) setChartData(d); }, () => {}); return () => { live = false; }; }, []);
  const chipPlayer = usePinyinPlayer(chartData, slow);
  const chipStop = useRef(chipPlayer.stop);
  chipStop.current = chipPlayer.stop;
  const pair = search.pair ?? DEFAULT_PAIR;
  const rule = search.rule ?? DEFAULT_RULE;
  const pool = useMemo(() => data ? toneExamplesByHsk(mode === 'pairs' ? pairPool(data, pair) : rulePool(data, rule), vocabularyWords) : [], [data, mode, pair, rule]);
  const row = selectedExample(pool, search.example);
  /* The window's middle-top ‹ › walk the matrix cells themselves, in the grid's reading order
     (first tone down the side, second across the top), skipping any pair with no words so a
     step never lands on an empty cell. DetailSheet offers them only when the window was opened
     from this page's own grid, so a deep link from a word card keeps Back/Close semantics and no
     arrows. Stepping clears the chosen word, exactly like clicking another cell. */
  const pairOrder = useMemo(() => data ? matrixPairOrder(key => pairPool(data, key).length > 0) : [], [data]);
  const pairIndex = pairOrder.indexOf(pair);
  // Both windows step through their own visible groups, never through another rule's words.
  const ruleOrder = useMemo(() => data ? RULE_ORDER.filter(key => rulePool(data, key).length > 0) : [], [data]);
  const groupOrder = mode === 'pairs' ? pairOrder : ruleOrder;
  const groupIndex = mode === 'pairs' ? pairIndex : ruleOrder.indexOf(rule);
  const previousGroup = groupIndex > 0 ? groupOrder[groupIndex - 1] : undefined;
  const nextGroup = groupIndex >= 0 && groupIndex < groupOrder.length - 1 ? groupOrder[groupIndex + 1] : undefined;
  const pickGroup = (key: string) => {
    if (mode === 'pairs') onChange({ pair: key, example: undefined });
    else { const target = ruleOrder.find(value => value === key); if (target) onChange({ rule: target, example: undefined }); }
  };

  // Any change of what is selected (or leaving the page) stops the current recording.
  const selectionKey = `${mode}|${pair}|${rule}|${row?.id ?? ''}`;
  useEffect(() => () => { generation.current += 1; chipStop.current(); stopRecording(); setStatus(IDLE); }, [selectionKey]);

  const play = async () => {
    if (!row) return;
    // Play-only, like every other speaker in the app: a tap while playing does nothing.
    if (status.kind === 'loading' || status.kind === 'playing') return;
    chipStop.current(); chipPlayer.clearError();
    const mine = ++generation.current;
    setStatus({ kind: 'loading', text: '' });
    const onSettle = (how: RecordingSettle) => {
      if (mine !== generation.current) return;
      // A finished recording leaves no label behind; only a failure says anything.
      if (how === 'failed') setStatus({ kind: 'error', text: 'The recording could not play. No other voice was used.' });
      else setStatus(IDLE);
    };
    const ok = await playRecordingAt(row.audio.url, slow ? SLOW_RATE : NORMAL_RATE, onSettle);
    if (ok && mine === generation.current) setStatus({ kind: 'playing', text: '' });
  };
  return <div className="page-enter library-page pinyin-page tone-sounds-page">
    <div className="page-heading library-heading"><div>
      <div className="eyebrow library-eyebrow">PINYIN SOUNDS · {mode === 'pairs' ? 'TONE PAIRS' : 'TONE CHANGES'}</div>
      <h1 ref={titleRef}>{headings[mode]}{data && <SourceInfo inline className="detail-footnote pinyin-source">
        Whole-word recordings · {data.source.speaker} · {data.source.copyright} / Shtooka<br/>
        <a href={data.source.licenseUrl} target="_blank" rel="noreferrer">{data.source.license}</a> · MP3 processing: {data.source.processingCredits}<br/>
        <a href={`${data.source.repository}/tree/${data.source.commit}`} target="_blank" rel="noreferrer">audio-cmn ({data.source.commit.slice(0, 7)})</a> · each the word card’s own recording, unchanged<br/>
        Dictionary and expected-in-speech labels are teaching drafts, not listening-reviewed<br/>
        Syllable chips play the Sound chart’s own recordings; Slower pronunciation (Preferences) slows the same files
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
        </div>
        {/* Mount only while open so the shared window records the actual opening
            history entry. Close/Back then return to the source grid or details,
            skipping example changes within this same tone-pair window. */}
        {detailOpen && <DetailSheet open title={row.headword} label={row.headword}
          position={groupIndex} total={groupOrder.length} neighbourLabel={mode === 'pairs' ? 'tone pair' : 'tone change'}
          onPrevious={previousGroup ? () => pickGroup(previousGroup) : undefined}
          onNext={nextGroup ? () => pickGroup(nextGroup) : undefined}
          onClose={() => { stop(); onChange(mode === 'pairs' ? { pair: undefined, example: undefined } : { rule: undefined, example: undefined }, true); }}>
          <PracticeCard row={row} pool={pool} mode={mode} hidden={hidden} status={status} onPick={id => onChange({ example: id })}
            chips={{ data: chartData, player: chipPlayer, error: chipPlayer.error, onPlay: (base, tone) => { generation.current += 1; setStatus(IDLE); void chipPlayer.play(sound(base, tone)); } }}
            onPlay={() => void play()}/>
        </DetailSheet>}
      </div>}
  </div>;
}

/** 4 × 5 grid of dictionary tone pairs; each cell shows its first word (hidden in Listen first). */
export function PairMatrix({ data, pair, hidden, onPick }: { data: TonePairData; pair: string; hidden: boolean; onPick: (pair: string) => void }) {
  return <section className="tone-matrix-section" aria-label="Tone pairs">
    <h2 className="pinyin-group-title">Choose a tone pair <span>20 pairs · {data.examples.filter(e => e.inPairMatrix).length} words</span></h2>
    <p className="tone-sounds-helper">First tone down the side, second tone across the top.</p>
    <div className="tone-matrix" role="group" aria-label="Tone pairs by dictionary tones">
      <span className="tone-matrix-corner" aria-hidden="true"/>
      {SECOND_TONES.map(t => <span key={t} className={`tone-matrix-axis tone-${t}`}><ToneContour tone={t}/>{t === 5 ? 'Neutral' : `Tone ${t}`}</span>)}
      {FIRST_TONES.map(first => [
        <span key={`row-${first}`} className={`tone-matrix-axis is-row tone-${first}`}><ToneContour tone={first}/>{first}</span>,
        ...SECOND_TONES.map(second => {
          const key = `${first}-${second}`;
          const words = toneExamplesByHsk(pairPool(data, key), vocabularyWords);
          const sample = words[0];
          // Pairs whose words change tone in speech (today only 3 + 3) get the neon border,
          // and their tile header shows the change (3 + 3 → 2 + 3).
          const changedWord = words.find(tonesChanged);
          const changes = Boolean(changedWord);
          return <div key={key} className={`tone-matrix-cell${pair === key ? ' is-selected' : ''}${changes ? ' is-tone-change' : ''}`} title={changes ? 'Changes tone in speech' : undefined}>
            <button type="button" className="tone-matrix-cell-trigger" aria-pressed={pair === key} aria-label={`${pairLabel(key)}; ${words.length} words${changes ? '; changes tone in speech' : ''}`} onClick={() => {
              // A matrix click is a new grid-originated browsing session. An old word-detail
              // return step must not hide the pair arrows or send Close back to Vocabulary.
              detailTrail.clear();
              onPick(key);
            }}/>
            <span className="tone-matrix-code"><ToneDigit tone={first} compact/> + <ToneDigit tone={second} compact/>{changedWord && <span className="tone-pair-change"> → <ToneDigit tone={changedWord.expectedSpokenTones[0] ?? first} compact/> + <ToneDigit tone={changedWord.expectedSpokenTones[1] ?? second} compact/></span>}</span>
            {sample && <span className="tone-matrix-example">
              <span className="tone-matrix-word" lang="zh-CN">{hidden ? '••' : sample.headword}</span>
              {!hidden && <span className="tone-matrix-reading">
                <span className="pinyin">{sample.expectedSpokenSyllables.join(' ')}</span>
                <span className="tone-matrix-audio" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                  <ExamplePronunciation request={{ text: sample.headword, audio: sample.audio }} label={sample.headword}/>
                </span>
              </span>}
            </span>}
          </div>;
        }),
      ])}
    </div>
    <p className="tone-sounds-helper"><strong>Dictionary tones stay visible.</strong> In the 3 + 3 cell, the first syllable normally rises in speech. A neutral ending has no fixed contour of its own.</p>
  </section>;
}

/** The three tone-change focus areas. */
export function RuleList({ rule, onPick }: { rule: ToneRule; onPick: (rule: ToneRule) => void }) {
  return <section className="tone-rule-section" aria-label="Tone changes">
    <h2 className="pinyin-group-title">Common tone changes <span>3 focus areas</span></h2>
    <div className="tone-rule-list">
      {RULE_ORDER.map(id => { const r = TONE_RULES[id]; return <button key={id} type="button" className={`tone-rule${rule === id ? ' is-selected' : ''}`} aria-pressed={rule === id} onClick={() => { detailTrail.clear(); onPick(id); }}>
        <span className="tone-rule-symbol" lang={r.hanzi ? 'zh-CN' : undefined}>{r.symbol}</span>
        <span className="tone-rule-copy"><strong>{r.title}</strong><span>{r.description}</span><small>{r.short}</small></span>
      </button>; })}
    </div>
    <p className="tone-sounds-helper"><strong>Speech has context.</strong> A third tone often stays low before a non-third tone. Longer third-tone chains depend on phrasing. This small sample does not cover every exception or regional pattern.</p>
  </section>;
}

/**
 * Shared Tone pairs / Tone changes card: recorded dictionary and draft spoken contours
 * above the word bank, with the exact selected word expanded in place. Character hints
 * retain vocabularyEntryId context; independent syllable buttons play only recorded
 * Sound chart clips. Rule changes never rewrite readings or audio bindings.
 * The word bank uses the Sound chart's shared small example cards and expandable grid inside
 * this card. Selecting an exact example changes the URL, not the recording source or hints.
 * Both speakers are play-only and the card carries no playback label: nothing appears while
 * a recording loads, plays or ends, and only a failure adds an error line.
 */
function PracticeCard({ row, pool, mode, hidden, status, onPlay, onPick, chips }: {
  row: TonePairExample; pool: TonePairExample[]; mode: ToneSoundsMode; hidden: boolean; status: Status;
  onPlay: () => void; onPick: (id: string) => void; chips: SyllableChips;
}) {
  const changed = tonesChanged(row);
  const wordsById = useMemo(() => new Map(vocabularyWords.map(word => [word.id, word])), []);
  const toneCaption = (t: Tone) => (t === 5 ? 'Neutral' : `Tone ${t}`);
  // Static Sound-Details-style tone tiles for the pair header (contour + label, no pinyin),
  // linked by an arrow between the first and second syllable.
  const toneTiles = (tones: readonly Tone[]) => tones.map((t, i) => <span key={i} className="tone-pair-tile-step">
    {i > 0 && <ArrowRight className="tone-pair-tile-arrow" aria-hidden="true"/>}
    <span className={`pinyin-tone-button tone-${t} tone-pair-tile`}><ToneContour tone={t}/><small>{toneCaption(t)}</small></span>
  </span>);
  const wordHint = openDetailsHint(row.headword, 'word');
  const wordLink = !hidden && row.vocabularyEntryId
    ? <Link to="/vocabulary" search={{ word: row.vocabularyEntryId }} className="detail-arrow-link tone-sounds-word-link" title={wordHint} aria-label={wordHint}><ArrowUpRight aria-hidden="true"/></Link>
    : undefined;
  const selectedIndex = pool.findIndex(e => e.id === row.id);
  const initialCount = 6;
  const wordBank = <SentenceHints backLabel={row.headword}><section className="pinyin-characters glyph-usage-section tone-sounds-bank" aria-label={mode === 'pairs' ? 'Words in this pair' : 'Examples for this change'}>
    <h3 className="eyebrow"><BookOpen size={13} aria-hidden="true"/>{mode === 'pairs' ? 'WORDS IN THIS PAIR' : 'EXAMPLES'} · {pool.length}</h3>
    <ExpandableCharacterGrid key={`${mode}:${pool[0]?.id}:${hidden}`} animateSelection initialCount={initialCount} defaultExpanded={selectedIndex >= initialCount} selectedKey={row.id} cards={pool.map((example, index) => {
      const record = example.vocabularyEntryId ? wordsById.get(example.vocabularyEntryId) : undefined;
      const hsk = record ? wordHskPill(record) : null;
      const own: HintWord | null = record ? { hanzi: record.hanzi, pinyin: record.pinyin, meaning: record.meaning, search: { tab: 'word', word: record.id }, audio: record.audio ?? null } : null;
      // Each collapsed card carries its own arrow to its own exact word record, never the
      // selected row's, so the header arrow always names the card it sits in.
      const ownHint = record ? openDetailsHint(record.hanzi, 'word') : '';
      const ownLink = !hidden && record
        ? <Link to="/vocabulary" search={{ word: record.id }} className="detail-arrow-link" title={ownHint} aria-label={ownHint}><ArrowUpRight aria-hidden="true"/></Link>
        : undefined;
      const isExpanded = example.id === row.id;
      const coloredPinyin = example.citationSyllables.map((syl, sylIndex) => (
        <span key={sylIndex} className={`tone-pair-syllable tone-${example.citationTones[sylIndex] ?? 5}`}>{sylIndex > 0 ? ' ' : ''}{syl}</span>
      ));
      return (
      <div
        key={example.id}
        data-layout-key={example.id}
        className={`glyph-usage-example glyph-parent-card tone-sounds-example${example.id === row.id ? ' is-selected' : ''}${isExpanded ? ' is-expanded' : ''}`}
        onClick={event => {
          // Ignore clicks on handled inner controls (audio speaker, glyph hints, pinyin button).
          if ((event.target as Element | null)?.closest('button, a, [role="button"]')) return;
          onPick(example.id);
        }}
      >
        {isExpanded ? <>
          <ExampleCardMeta identity={hidden ? <span className="eyebrow">Recording {index + 1}</span> : hsk ? <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span> : <UsageLabel rank={null} compact/>} link={wordLink}/>
          <div className="tone-pair-expanded-top">
            <span className="pinyin-character-glyphs">{Array.from(hidden ? '••' : example.headword).map((glyph, glyphIndex) => {
              const tone = example.citationTones[glyphIndex];
              const fallback = <Button variant="ghost" className="decomposition-glyph" aria-pressed={true} aria-label={hidden ? `Selected recording ${index + 1}, tile ${glyphIndex + 1}` : `${example.headword}, tile ${glyphIndex + 1}`} onClick={() => onPick(example.id)}><strong>{glyph}</strong></Button>;
              return <span key={glyphIndex} className={tone ? `tone-pair-glyph tone-${tone}` : undefined}>{hidden ? fallback : <SoundExampleGlyph glyph={glyph} word={own} fallback={fallback}/>}</span>;
            })}</span>
            <div className="tone-pair-expanded-info">
              {!hidden && <div className="tone-pair-expanded-pinyin" lang="zh-Latn-pinyin">{coloredPinyin}</div>}
              {!hidden && <p className="tone-pair-expanded-meaning">{example.english}</p>}
              {hidden && <p className="tone-pair-expanded-meaning">Listen, then reveal to see the word.</p>}
            </div>
          </div>
          <div className="tone-pair-expanded-actions">
            {!hidden && <div className="tone-pair-syllable-group">{example.chartLinks.map((l, i) => {
              const id = soundId(l.base, l.tone);
              const recorded = chips.data ? hasRecording(chips.data, l.base, l.tone) : false;
              const on = chips.player.playing === id;
              return <button key={`${id}-${i}`} type="button" className={`tone-pair-syllable-btn tone-${l.tone}${recorded ? '' : ' is-unrecorded'}${on ? ' is-playing' : ''}`} disabled={!recorded}
                aria-label={recorded ? `Play ${toneMark(l.base, l.tone)}` : `No recording for ${toneMark(l.base, l.tone)}`} title={recorded ? 'Sound chart recording' : 'No Sound chart recording'}
                onClick={() => { if (!on) chips.onPlay(l.base, l.tone); }}>
                {recorded ? <Volume2 aria-hidden="true"/> : <VolumeX aria-hidden="true"/>}
                <span className="tone-pair-syllable-pinyin" lang="zh-Latn-pinyin">{l.reading}</span>
                <span className="tone-pair-syllable-tone">{toneCaption(l.tone)}</span>
              </button>;
            })}</div>}
            <Button type="button" className="tone-pair-play-word" aria-label={`Play ${hidden ? 'the recording' : example.headword}`} title={`Play word · ${example.audio.speaker}`} onClick={onPlay}>
              <Volume2 aria-hidden="true"/>Play word
            </Button>
          </div>
          {(chips.error || status.kind === 'error') && <p className="tone-sounds-status pinyin-audio-error" role="status" aria-live="polite">{chips.error || status.text}</p>}
        </> : <>
          <ExampleCardMeta identity={hidden ? `Recording ${index + 1}` : hsk ? <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span> : <UsageLabel rank={null} compact/>} link={ownLink}/>
          <span className="glyph-usage-reference">
            <span className="pinyin-character-glyphs">{Array.from(hidden ? '••' : example.headword).map((glyph, glyphIndex) => {
              const tone = example.citationTones[glyphIndex];
              const fallback = <Button variant="ghost" className="decomposition-glyph" aria-pressed={example.id === row.id} aria-label={hidden ? `Select recording ${index + 1}, tile ${glyphIndex + 1}` : `Select ${example.headword}, tile ${glyphIndex + 1}`} onClick={() => onPick(example.id)}><strong>{glyph}</strong></Button>;
              return <span key={glyphIndex} className={tone ? `tone-pair-glyph tone-${tone}` : undefined}>{hidden ? fallback : <SoundExampleGlyph glyph={glyph} word={own} fallback={fallback}/>}</span>;
            })}</span>
            <span className="glyph-usage-facts">
              <span className="glyph-usage-facts-row"><span className="example-pinyin-row">
                {!hidden && <Button variant="link" className="pinyin" title={`Select ${example.headword}`} onClick={() => onPick(example.id)}>{coloredPinyin}</Button>}
                {/* This exact whole-word attachment plays independently of selection. The
                    shared speaker never joins syllables or falls back after a failed clip. */}
                <ExamplePronunciation request={{ text: example.headword, audio: example.audio }} label={hidden ? `recording ${index + 1}` : example.headword}/>
              </span></span>
              {!hidden && <SmallGridMeaning text={example.english}/>}
            </span>
          </span>
        </>}
      </div>
    ); })}/>
  </section></SentenceHints>;
  return <section className="pinyin-player tone-sounds-card" aria-label="Selected recording">
      <header className="tone-pair-hero" title={changed ? `Dictionary tones: ${toneLabel(row.citationTones)} · expected in speech: ${toneLabel(row.expectedSpokenTones)} (draft)` : `Dictionary tones: ${toneLabel(row.citationTones)}`}>
        <div className="tone-pair-hero-group" aria-label={`Dictionary tones: ${toneLabel(row.citationTones)}`}>{toneTiles(row.citationTones)}</div>
        {changed && <>
          <span className="tone-pair-spoken-sep">spoken</span>
          <div className="tone-pair-hero-group" aria-label={`Expected in speech: ${toneLabel(row.expectedSpokenTones)}`}>{toneTiles(row.expectedSpokenTones)}</div>
        </>}
      </header>
      {wordBank}
  </section>;
}
