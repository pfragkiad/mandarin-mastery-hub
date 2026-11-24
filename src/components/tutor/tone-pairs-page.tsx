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
import { ArrowRight, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playRecordingAt, stopRecording, NORMAL_RATE, SLOW_RATE, type RecordingSettle } from '@/lib/audio';
import { words as vocabularyWords, type Word } from '@/lib/mandarin';
import { isHanziChar } from '@/lib/sentence-align';
import { usePublishSections } from '@/lib/section-switch';
import { hasRecording, loadPinyinData, soundId, toneMark, type PinyinData, type Tone } from '@/lib/pinyin-guide';
import {
  DEFAULT_PAIR, DEFAULT_RULE, FIRST_TONES, RULE_ORDER, SECOND_TONES, TONE_RULES,
  listeningTip, loadTonePairs, pairLabel, pairPool, rulePool, selectedExample, toneLabel, tonesChanged,
  type TonePairData, type TonePairExample, type ToneRule, type ToneChangesSearch, type TonePairsSearch,
} from '@/lib/tone-pairs';
import { SourceInfo } from './source-info';
import { ToneContour, usePinyinPlayer, sound, type PinyinPlayer } from './pinyin-shared';
import { RecordDetailTitle } from './record-detail-title';
import { SentenceHints } from './sentence-section';
import { HintChar, useLessonHints, type HintWord } from './lesson-hints';
import { usePhrasePairing } from './phrase-pairing';
import { useWorkspace } from './workspace';
import { useOneLineTitle } from './one-line-title';

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
  const pool = data ? (mode === 'pairs' ? pairPool(data, pair) : rulePool(data, rule)) : [];
  const row = selectedExample(pool, search.example);

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
        <PracticeCard row={row} pool={pool} mode={mode} hidden={hidden} status={status}
          chips={{ data: chartData, player: chipPlayer, error: chipPlayer.error, onPlay: (base, tone) => { generation.current += 1; setStatus(IDLE); void chipPlayer.play(sound(base, tone)); } }}
          onPlay={() => void play()}
          onReveal={() => onChange({ listen: hidden ? undefined : true }, true)}/>
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
          // Pairs whose words change tone in speech (today only 3 + 3) get the neon border,
          // and their tile header shows the change (3 + 3 → 2 + 3).
          const changedWord = words.find(tonesChanged);
          const changes = Boolean(changedWord);
          return <button key={key} type="button" className={`tone-matrix-cell${pair === key ? ' is-selected' : ''}${changes ? ' is-tone-change' : ''}`} aria-pressed={pair === key} aria-label={`${pairLabel(key)}; ${words.length} words${changes ? '; changes tone in speech' : ''}`} title={changes ? 'Changes tone in speech' : undefined} onClick={() => onPick(key)}>
            <span className="tone-matrix-code"><ToneDigit tone={first} compact/> + <ToneDigit tone={second} compact/>{changedWord && <span className="tone-pair-change"> → <ToneDigit tone={changedWord.expectedSpokenTones[0] ?? first} compact/> + <ToneDigit tone={changedWord.expectedSpokenTones[1] ?? second} compact/></span>}</span>
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

/**
 * The selected word, laid out like every other detail card (RecordDetailTitle): hanzi, then
 * pinyin with its speaker and the translation, and the tone-pair pill at the top right.
 * The hanzi get the detail cards' hover pairing with the pinyin and, inside SentenceHints (the
 * remembered Character hints switch), a click opens each character's quick card; the word
 * context is the exact Vocabulary record bound to this recording (vocabularyEntryId), never a
 * spelling match. Below: each dictionary syllable as a chip that plays the Sound chart's
 * own recording in place (no navigation). The dictionary → expected tone change lives in
 * the pill and the matrix tile header, not in a separate compare block.
 * Both speakers are play-only and the card carries no playback label: nothing appears while
 * a recording loads, plays or ends, and only a failure adds an error line.
 */
function PracticeCard({ row, pool, mode, hidden, status, onPlay, onReveal, chips }: {
  row: TonePairExample; pool: TonePairExample[]; mode: ToneSoundsMode; hidden: boolean; status: Status;
  onPlay: () => void; onReveal: () => void; chips: SyllableChips;
}) {
  const changed = tonesChanged(row);
  const reading = row.expectedSpokenSyllables.join(' ');
  const pairing = usePhrasePairing(row.headword, reading, !hidden);
  const word = useMemo(() => (row.vocabularyEntryId ? vocabularyWords.find(w => w.id === row.vocabularyEntryId) ?? null : null), [row.vocabularyEntryId]);
  // Play-only speaker, consistent with every other card: no stop state, no icon swap.
  const speaker = <Button variant="ghost" size="icon" aria-label={`Listen to ${hidden ? 'the recording' : row.headword}`} title={`Listen · ${row.audio.speaker}`} onClick={onPlay}><Volume2/></Button>;
  // The header pill names the pair; when speech changes the tones it shows the change too (3 + 3 → 2 + 3).
  const digits = (tones: readonly number[]) => tones.map((t, i) => <span key={i}>{i > 0 && ' + '}<ToneDigit tone={t}/></span>);
  const pill = <span className="word-hsk-id tone-pair-pill" title={changed ? `Dictionary tones: ${toneLabel(row.citationTones)} · expected in speech: ${toneLabel(row.expectedSpokenTones)} (draft)` : `Dictionary tones: ${toneLabel(row.citationTones)}`}>
    {digits(row.citationTones)}{changed && <span className="tone-pair-change"> → {digits(row.expectedSpokenTones)}</span>}
  </span>;
  return <section className="pinyin-player tone-sounds-card" aria-label="Selected recording">
    <div className="pinyin-player-head">
      <span className="eyebrow">{mode === 'pairs' ? 'Tone pair' : 'Tone change'} · {pool.findIndex(e => e.id === row.id) + 1} of {pool.length}</span>
      <Button variant="ghost" size="sm" className="tone-sounds-reveal" aria-pressed={hidden} onClick={onReveal}>{hidden ? 'Reveal word' : 'Listen first'}</Button>
    </div>
    <SentenceHints backLabel={row.headword}>
      {hidden
        ? <RecordDetailTitle hanzi="••" glyphClassName="tone-sounds-hidden-glyph" pill={pill} pinyinContent={<><span className="pinyin">Listen, then reveal</span>{speaker}</>} meaning="Say back what you hear."/>
        : <RecordDetailTitle hanzi={row.headword} glyphContent={<ToneHeadword headword={row.headword} word={word} pairing={pairing}/>} pill={pill}
            pinyinContent={<><span className="pinyin" title={changed ? 'Expected in speech · draft' : undefined}>{pairing.paired ? pairing.pinyinText : reading}</span>{speaker}</>} meaning={row.english}/>}
    </SentenceHints>
    <p className="pinyin-player-tip">{hidden ? 'Play the complete word. Reveal it when you’re ready to compare.' : listeningTip(row)}</p>
    {(chips.error || status.kind === 'error') && <p className="tone-sounds-status pinyin-audio-error" role="status" aria-live="polite">{chips.error || status.text}</p>}
    {hidden ? <p className="tone-sounds-helper">Reveal the word to hear its syllables one by one.</p> : <>
      <div className="tone-sounds-links">
        <span className="eyebrow">Each dictionary sound</span>
        <div className="tone-sounds-chips">{row.chartLinks.map((l, i) => {
          const id = soundId(l.base, l.tone);
          const recorded = chips.data ? hasRecording(chips.data, l.base, l.tone) : false;
          const on = chips.player.playing === id;
          // Play-only, like every other speaker: the icon never becomes a stop button and a
          // tap while sounding does nothing. The tint only marks which syllable is sounding.
          return <button key={`${id}-${i}`} type="button" className={`tone-sounds-chip tone-${l.tone}${on ? ' is-playing' : ''}`} disabled={!recorded}
            aria-label={recorded ? `Play ${toneMark(l.base, l.tone)}` : `No recording for ${toneMark(l.base, l.tone)}`} title={recorded ? 'Sound chart recording' : undefined}
            onClick={() => { if (!on) chips.onPlay(l.base, l.tone); }}>{l.reading}<Volume2/></button>;
        })}</div>
        {row.vocabularyEntryId && <Link to="/vocabulary" search={{ word: row.vocabularyEntryId }} className="tone-sounds-word-link">Open the word card<ArrowRight/></Link>}
      </div>
      {/* No per-word source footer: recording and licence details live only in the page title's (i). */}
    </>}
  </section>;
}

/** The card's hanzi: hover pairing with the pinyin, plus quick-card targets when Character hints are on. */
function ToneHeadword({ headword, word, pairing }: { headword: string; word: Word | null; pairing: ReturnType<typeof usePhrasePairing> }) {
  const hints = useLessonHints();
  const chars = Array.from(headword);
  if (!hints?.enabled) return <>{chars.map(pairing.glyph)}</>;
  const own: HintWord | null = word ? { hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, search: { tab: 'word', word: word.id }, audio: word.audio ?? null } : null;
  return <>{chars.map((ch, i) => isHanziChar(ch) ? <HintChar key={i} glyph={ch} word={own} {...pairing.glyphProps(i)}/> : pairing.glyph(ch, i))}</>;
}
