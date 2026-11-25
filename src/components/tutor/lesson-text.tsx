import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { libraryDestination } from '@/lib/character-library';
import { characterAudioRequest } from '@/lib/catalog-store';
import { vocabularyKind } from '@/lib/mandarin';
import { openDetailsHint } from '@/lib/tile-hints';
import { useWorkspace } from './workspace';
import { ExamplePronunciation } from './example-pronunciation';
import { HintChar, HintGlyphs, useLessonHints } from './lesson-hints';
import { usePhrasePairing } from './phrase-pairing';
import type { AudioRequest } from '@/lib/audio';
import type { Word } from '@/lib/mandarin';
import { segmentLessonExpression, type LessonSegment } from '@/lib/lesson-segments';
import { pseudoTranslationParts } from '@/lib/lesson-pattern';

/**
 * Shared text pieces for study lessons (lesson-page.tsx, lessons-index.tsx).
 *
 * - LessonText: recorded prose. Runs of Han characters get lang="zh-CN" (so the chosen
 *   hanzi font draws them) and the files' single-asterisk *emphasis* becomes <em>; the
 *   text itself is never rewritten.
 * - LessonHanzi: a recorded hanzi field, linked only on an exact written-form match —
 *   one character → its Glyphs record (libraryDestination), several → the single
 *   Vocabulary entry with exactly that headword. Anything else (patterns like 以 X 为 Y,
 *   ambiguous or unknown forms) stays plain text, so no record identity is guessed.
 * - LessonTerm: hanzi + orange pinyin + speaker (+ meaning). The speaker uses the matched
 *   word's own recording (only when its reading is the lesson's, see sameReading), a single
 *   character's exact-reading recording, or browser speech for the recorded pinyin through
 *   the shared audio pipeline.
 * - LessonWord: a vocabulary card's headword, linked as a whole to its exact record (see below).
 *
 * LessonText also pairs prose "hanzi (pinyin)" terms (inlineSegments + useLessonPairing), so
 * hovering 过 or its bracketed "guo" rings the other side, independent of the hints switch.
 *
 * Inside a lesson page (LessonHintsProvider) LessonText and LessonHanzi hand every Han
 * character to the lesson character hints (lesson-hints.tsx) instead: a hover ring and a
 * click-to-open quick card while hints are on, plain text (no link) while they are off.
 * Prose runs are mouse/touch targets only (not tab stops), so a long lesson never fills
 * the keyboard order with hundreds of characters; recorded hanzi fields stay focusable.
 */

const HAN = /(\p{Script=Han}+)/u;
const HAN_TEST = /^\p{Script=Han}+$/u;
const HAN_CHAR = /^\p{Script=Han}$/u;

/**
 * One hover pairing shared by a recorded hanzi field and its recorded pinyin
 * (phrase-pairing.tsx): hovering either side rings its counterpart, exactly like the
 * phrase cards and the "In a sentence" cross-highlight. This is independent of the
 * character-hints switch — hints own click (quick card), pairing owns hover — so the
 * borders work with hints on or off. Fails closed to the plain recorded text until the
 * syllable inventory loads or the recorded pinyin does not align with the characters.
 * With hints on, each character stays a hint target (quick card, word context) and the
 * pair class/handlers merge into it.
 */
export function useLessonPairing(hanzi: string, pinyin: string | null | undefined, focusable = true) {
  const hints = useLessonHints();
  // Identified words (words-first, lesson-segments.ts) group the hover: hovering any
  // character rings the whole word and its syllables, with hints on or off.
  const allWords = useMemo(() => hints ? hints.wordsFor(hanzi) : null, [hints, hanzi]);
  const groups = useMemo(() => {
    if (!allWords) return undefined;
    let id = 0; let prev: unknown = null;
    return allWords.map(w => { if (!w) { prev = null; return null; } if (w !== prev) { id++; prev = w; } return id; });
  }, [allWords]);
  const pairing = usePhrasePairing(hanzi, pinyin, Boolean(pinyin), true, groups);
  const words = hints?.enabled ? allWords : null;
  const hanziBody = Array.from(hanzi).map((ch, i) => {
    if (!HAN_CHAR.test(ch)) return ch;
    if (hints?.enabled) return <HintChar key={i} glyph={ch} word={words?.[i] ?? null} focusable={focusable} {...pairing.glyphProps(i)}/>;
    return pairing.paired ? pairing.glyph(ch, i) : ch;
  });
  return { hanziBody, pinyinBody: pairing.pinyinText };
}

/** A recorded hanzi field shown beside its recorded pinyin, hover-paired both ways. */
export function LessonPairedLine({ hanzi, pinyin, className = 'lesson-hanzi', focusable = true }: { hanzi: string; pinyin?: string | undefined; className?: string; focusable?: boolean }) {
  const pair = useLessonPairing(hanzi, pinyin, focusable);
  return <>
    <span className={className} lang="zh-CN">{pair.hanziBody}</span>
    {pinyin && <span className="pinyin">{pair.pinyinBody}</span>}
  </>;
}

/**
 * A pattern heading (Core v3.6.0 migration report): the recorded pseudo-translation, then the
 * recorded Hanzi, then the recorded pinyin, each on its own line, wrapping inside the card. Owner
 * decision 2026-11-24 (deviating from the report's Hanzi-first order): the pseudo-translation is the
 * line a learner can read, so it leads and is the largest; the Mandarin template lines follow,
 * smaller. Inputs: the three recorded fields; an empty pseudo-translation (legacy
 * conversational/character cards) leaves the two Mandarin lines. Owner decision 2026-11-24: pattern lines have no speaker — formulas stay out of
 * text-to-speech; the worked example below keeps its own audio. Hanzi still gets character
 * hints and hover pairing like other lesson text.
 */
export function LessonPatternHeading({ hanzi, pinyin, pseudoTranslation }: { hanzi: string; pinyin?: string | undefined; pseudoTranslation?: string | undefined }) {
  const pair = useLessonPairing(hanzi, pinyin);
  return <div className="lesson-pattern-line lesson-pattern-heading">
    {pseudoTranslation && <PseudoTranslation value={pseudoTranslation}/>}
    {hanzi && <span className="lesson-hanzi" lang="zh-CN">{pair.hanziBody}</span>}
    {pinyin && <span className="pinyin">{pair.pinyinBody}</span>}
  </div>;
}

/**
 * The third pattern line as React text nodes: <slot> placeholders stay visible (muted), fixed
 * Mandarin is bold in the hanzi font, everything else is kept verbatim (see lesson-pattern.ts).
 * It blurs with the EN face, as a translation.
 */
function PseudoTranslation({ value }: { value: string }) {
  return <span className="lesson-pattern-gloss lesson-translation">
    {pseudoTranslationParts(value).map((part, i) => part.kind === 'slot' ? <span key={i} className="lesson-pattern-slot">{part.text}</span>
      : part.kind === 'mandarin' ? <strong key={i} lang="zh-CN">{part.text}</strong>
      : <Fragment key={i}>{part.text}</Fragment>)}
  </span>;
}

/** The lesson hero's headword: big glyph + reading + speaker, hover-paired. */
export function LessonHeadword({ hanzi, pinyin }: { hanzi: string; pinyin: string }) {
  const pair = useLessonPairing(hanzi, pinyin);
  return <div className="lesson-headword">
    <span className="lesson-hanzi lesson-headword-glyph" lang="zh-CN">{pair.hanziBody}</span>
    <span className="lesson-headword-reading"><span className="pinyin">{pair.pinyinBody}</span><LessonSpeaker hanzi={hanzi} pinyin={pinyin}/></span>
  </div>;
}

/**
 * Prose segments: plain text, or a Han run directly followed by a parenthesised reading —
 * "过 (guo)", "我去过北京一次 (Wǒ qù guo Běijīng yí cì)", full-width （）too. The bracket must
 * hold only pinyin-like Latin text; anything else stays a plain segment. Whether the reading
 * really pairs with the characters is decided later by the syllable alignment (fail closed).
 */
export type InlineSegment = { kind: 'text'; text: string } | { kind: 'term'; hanzi: string; gap: string; open: string; pinyin: string; close: string };
const INLINE_TERM = /(\p{Script=Han}+)(\s*)([(（])([^()（）\n]+)([)）])/gu;
const PINYIN_LIKE = /^(?=.*\p{Letter})[\p{Script=Latin}\p{Mark}\s'’,.!?;:-]+$/u;
export function inlineSegments(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_TERM)) {
    const [whole, hanzi, gap, open, pinyin, close] = m as unknown as [string, string, string, string, string, string];
    if (!PINYIN_LIKE.test(pinyin.trim())) continue;
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    out.push({ kind: 'term', hanzi, gap, open, pinyin, close });
    last = at + whole.length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** A prose "hanzi (pinyin)" pair: the characters and the bracketed syllables hover-pair
 *  both ways (useLessonPairing; plain recorded text when they do not align). */
function InlinePairedTerm({ hanzi, gap, open, pinyin, close }: Extract<InlineSegment, { kind: 'term' }>) {
  const pair = useLessonPairing(hanzi, pinyin.trim(), false);
  const lead = pinyin.match(/^\s*/)?.[0] ?? '';
  const trail = pinyin.match(/\s*$/)?.[0] ?? '';
  return <><span lang="zh-CN" className="lesson-inline-hanzi">{pair.hanziBody}</span>{gap}{open}{lead}{pair.pinyinBody}{trail}{close}</>;
}

export function LessonText({ text }: { text: string | null | undefined }) {
  const hints = useLessonHints();
  if (!text) return null;
  const hanRuns = (piece: string) => piece.split(HAN).map((part, j) => HAN_TEST.test(part) ? <span key={j} lang="zh-CN" className="lesson-inline-hanzi">{hints ? <HintGlyphs text={part} focusable={false}/> : part}</span> : <Fragment key={j}>{part}</Fragment>);
  // Split on *emphasis* first, then pair "hanzi (pinyin)" terms, then mark the remaining Han runs.
  return <>{text.split(/(\*[^*\n]+\*)/).map((piece, i) => {
    const emphasis = /^\*[^*\n]+\*$/.test(piece);
    const body = inlineSegments(emphasis ? piece.slice(1, -1) : piece).map((seg, k) => seg.kind === 'term' ? <InlinePairedTerm key={k} {...seg}/> : <Fragment key={k}>{hanRuns(seg.text)}</Fragment>);
    return emphasis ? <em key={i}>{body}</em> : <Fragment key={i}>{body}</Fragment>;
  })}</>;
}

type HanziTarget = { kind: 'glyph'; search: ReturnType<typeof libraryDestination> & object } | { kind: 'word'; search: { tab: 'word' | 'idiom' | 'phrase'; word: string }; audio: AudioRequest['audio']; reading?: string };

/** Exact-match destination for one recorded hanzi field, or null. Re-evaluated when the catalogue loads. */
export function useHanziTarget(hanzi: string): HanziTarget | null {
  const { preferences, items, catalogVersion } = useWorkspace();
  return useMemo(() => {
    const chars = Array.from(hanzi);
    if (!HAN_TEST.test(hanzi)) return null;
    if (chars.length === 1) { const dest = libraryDestination(hanzi, preferences.includeTraditional); return dest ? { kind: 'glyph', search: dest } : null; }
    const matches = items.filter(w => w.hanzi === hanzi);
    const only = matches.length === 1 ? matches[0] : undefined;
    return only ? { kind: 'word', search: { tab: vocabularyKind(only), word: only.id }, audio: only.audio ?? null, reading: only.pinyin } : null;
    // catalogVersion: libraryDestination reads the lazily loaded catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hanzi, items, preferences.includeTraditional, catalogVersion]);
}

export function LessonHanzi({ hanzi, className = '', focusable = true }: { hanzi: string; className?: string; focusable?: boolean }) {
  const target = useHanziTarget(hanzi);
  const hints = useLessonHints();
  const cls = `lesson-hanzi ${className}`.trim();
  // Lesson page: hints replace the direct links (popup carries the full-card link).
  if (hints) return <span className={cls} lang="zh-CN"><HintGlyphs text={hanzi} focusable={focusable}/></span>;
  if (target?.kind === 'glyph') return <Link to="/characters" search={target.search} className={`${cls} is-linked`} lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>;
  if (target?.kind === 'word') return <Link to="/vocabulary" search={target.search} className={`${cls} is-linked`} lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>;
  return <span className={cls} lang="zh-CN">{hanzi}</span>;
}

/** Speaker for a recorded hanzi + pinyin pair (see the component note above). */
export function LessonSpeaker({ hanzi, pinyin }: { hanzi: string; pinyin: string }) {
  const target = useHanziTarget(hanzi);
  if (!pinyin || !HAN_TEST.test(hanzi.replace(/[，。？！、\s]/gu, ''))) return null;
  // Same rule as LessonWord: the matched card's recording plays only under the card's own
  // reading; a different lesson reading falls back to speech for the lesson's pinyin.
  const request: AudioRequest = target?.kind === 'word' ? { text: hanzi, reading: pinyin, audio: sameReading(target.reading, pinyin) ? target.audio ?? null : null }
    : Array.from(hanzi).length === 1 ? characterAudioRequest(hanzi, pinyin) : { text: hanzi, reading: pinyin, audio: null };
  return <ExamplePronunciation request={request} label={hanzi}/>;
}

export function LessonTerm({ hanzi, pinyin, meaning, size = 'md', after }: { hanzi: string; pinyin?: string | undefined; meaning?: string | undefined; size?: 'md' | 'lg'; after?: ReactNode }) {
  const pair = useLessonPairing(hanzi, pinyin);
  return <span className={`lesson-term is-${size}`}>
    <span className="lesson-hanzi" lang="zh-CN">{pair.hanziBody}</span>
    {pinyin && <span className="lesson-term-reading"><span className="pinyin">{pair.pinyinBody}</span><LessonSpeaker hanzi={hanzi} pinyin={pinyin}/></span>}
    {meaning && <span className="lesson-term-meaning"><LessonText text={meaning}/></span>}
    {after}
  </span>;
}

/**
 * Whether a recorded word reading is the lesson's reading, so that word's recording may be
 * played under the lesson's pinyin. Only spelling noise is ignored — Unicode composition,
 * case, spaces, syllable apostrophes and punctuation ("Nǐ hǎo!" = "nǐhǎo") — never tone marks
 * or letters, so a sandhi spelling (bú kèqi vs bù kèqi) or another reading falls back to speech.
 * An unknown record reading (undefined) never matches.
 */
export function sameReading(recorded: string | null | undefined, lesson: string): boolean {
  if (!recorded) return false;
  const norm = (p: string) => p.normalize('NFC').toLowerCase().replace(/[\s'’‘`,.!?;:，。！？；：、…"“”-]+/gu, '');
  const a = norm(recorded);
  return a.length > 0 && a === norm(lesson);
}

/**
 * A lesson's own word (a vocabulary card's headword): the hanzi links straight to its
 * Vocabulary or Glyphs record and the speaker plays that record's recording.
 *
 * Inputs: the recorded hanzi/pinyin/meaning and `record`, the exact Vocabulary record the
 * caller resolved (topic lessons: syllabusEntryFor, by HSK entry number + headword).
 * `record === null` means "no exact record" and keeps plain text with speech for the
 * recorded pinyin; `record` left out falls back to useHanziTarget's exact written-form
 * match (character lessons, whose words carry no syllabus number).
 *
 * The link is the word's own target, so it replaces the per-character hint cards on this
 * one heading (a hint click inside a link would open two things). The record's recording
 * is used only when its reading is the lesson's reading (sameReading), so a
 * recording of another reading is never played under this pinyin.
 *
 * `tile` lays it out like a Vocabulary grid card: the hanzi in its own bordered box
 * (coloured by `inkClass`, the record's card ink, foreground by default) with the reading
 * and translation stacked to its right. Links, audio and hints are unchanged.
 */
export function LessonWord({ hanzi, pinyin, meaning, record, tile = false, inkClass = '' }: { hanzi: string; pinyin: string; meaning?: string | undefined; record?: Word | null | undefined; tile?: boolean; inkClass?: string }) {
  const fallback = useHanziTarget(hanzi);
  const segments = useLessonSegments(hanzi);
  // On a lesson page an expression no single record matches uses the hint popups (word + arrow).
  const hints = useLessonHints();
  const pair = useLessonPairing(hanzi, pinyin);
  // On a lesson page every unresolved-by-caller expression uses the hint cards, even one with an exact
  // record (its card offers the word link), so all key expressions behave alike.
  const segmented = hints != null && record === undefined && segments.some(s => s.kind !== 'text');
  const target: HanziTarget | null = record === undefined ? fallback
    : record ? { kind: 'word', search: { tab: vocabularyKind(record), word: record.id }, audio: record.audio ?? null } : null;
  // A recording is borrowed only from a record read exactly as the lesson reads it, whether the
  // record was passed in or found by exact headword (谢谢你 never plays another reading's audio).
  const linkedReading = record ? record.pinyin : target?.kind === 'word' ? target.reading : undefined;
  const request: AudioRequest = target?.kind === 'word' ? { text: hanzi, reading: pinyin, audio: sameReading(linkedReading, pinyin) ? target.audio ?? null : null }
    : Array.from(hanzi).length === 1 ? characterAudioRequest(hanzi, pinyin) : { text: hanzi, reading: pinyin, audio: null };
  const head = segmented
    ? <span className={`lesson-hanzi lesson-word-segments${target ? ' is-recorded' : ''}`} lang="zh-CN">{pair.hanziBody}</span>
    : target?.kind === 'glyph'
    ? <Link to="/characters" search={target.search} className="lesson-hanzi is-linked lesson-word-link" lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>
    : target?.kind === 'word'
      ? <Link to="/vocabulary" search={target.search} className="lesson-hanzi is-linked lesson-word-link" lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>
      : record === undefined && segments.some(s => s.kind !== 'text')
        ? <span className="lesson-hanzi lesson-word-segments" lang="zh-CN">{hints ? pair.hanziBody : segments.map((s, i) => <SegmentLink key={i} segment={s}/>)}</span>
        : <span className="lesson-hanzi" lang="zh-CN">{hanzi}</span>;
  const reading = <span className="lesson-term-reading"><span className="pinyin">{segmented ? pair.pinyinBody : pinyin}</span>{HAN_TEST.test(hanzi) && <ExamplePronunciation request={request} label={hanzi}/>}</span>;
  const gloss = meaning && <span className="lesson-term-meaning"><LessonText text={meaning}/></span>;
  if (tile) return <span className="lesson-term is-tile">
    <span className={`lesson-word-tile${inkClass ? ` ${inkClass}` : ''}`}>{head}</span>
    <span className="lesson-term-side">{reading}{gloss}</span>
  </span>;
  return <span className="lesson-term is-lg">
    {head}
    {reading}
    {gloss}
  </span>;
}

/** Unique-headword segmentation of an expression no single record matches (lesson-segments.ts). */
function useLessonSegments(hanzi: string): LessonSegment[] {
  const { items } = useWorkspace();
  return useMemo(() => {
    const byHead = new Map<string, string | null>();
    for (const w of items) byHead.set(w.hanzi, byHead.has(w.hanzi) ? null : w.id);
    return segmentLessonExpression(hanzi, h => byHead.get(h) ?? null);
  }, [hanzi, items]);
}

/** One piece of a segmented expression: its exact word record, else its Glyphs record, else plain. */
function SegmentLink({ segment }: { segment: LessonSegment }) {
  const { items, preferences } = useWorkspace();
  if (segment.kind === 'word') {
    const word = items.find(w => w.id === segment.id);
    if (word) { const tab = vocabularyKind(word); return <Link to="/vocabulary" search={{ tab, word: word.id }} className="is-linked lesson-word-link" title={openDetailsHint(segment.text, tab)}>{segment.text}</Link>; }
  }
  if (segment.kind === 'char') {
    const dest = libraryDestination(segment.text, preferences.includeTraditional);
    if (dest) return <Link to="/characters" search={dest} className="is-linked lesson-word-link" title={openDetailsHint(segment.text, dest.tab)}>{segment.text}</Link>;
  }
  return <>{segment.text}</>;
}
