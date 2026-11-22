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
 *   word's own recording, a single character's exact-reading recording, or browser speech
 *   for the recorded pinyin through the shared audio pipeline.
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
  const pairing = usePhrasePairing(hanzi, pinyin, Boolean(pinyin), true);
  const word = hints?.enabled ? hints.wordFor(hanzi) : null;
  const hanziBody = Array.from(hanzi).map((ch, i) => {
    if (!HAN_CHAR.test(ch)) return ch;
    if (hints?.enabled) return <HintChar key={i} glyph={ch} word={word} focusable={focusable} {...pairing.glyphProps(i)}/>;
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

type HanziTarget = { kind: 'glyph'; search: ReturnType<typeof libraryDestination> & object } | { kind: 'word'; search: { tab: 'word' | 'phrase'; word: string }; audio: AudioRequest['audio'] };

/** Exact-match destination for one recorded hanzi field, or null. Re-evaluated when the catalogue loads. */
export function useHanziTarget(hanzi: string): HanziTarget | null {
  const { preferences, items, catalogVersion } = useWorkspace();
  return useMemo(() => {
    const chars = Array.from(hanzi);
    if (!HAN_TEST.test(hanzi)) return null;
    if (chars.length === 1) { const dest = libraryDestination(hanzi, preferences.includeTraditional); return dest ? { kind: 'glyph', search: dest } : null; }
    const matches = items.filter(w => w.hanzi === hanzi);
    const only = matches.length === 1 ? matches[0] : undefined;
    return only ? { kind: 'word', search: { tab: vocabularyKind(only), word: only.id }, audio: only.audio ?? null } : null;
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
  const request: AudioRequest = target?.kind === 'word' ? { text: hanzi, reading: pinyin, audio: target.audio ?? null }
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

const spacing = (pinyin: string) => pinyin.replace(/\s+/g, '').toLowerCase();

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
 * is used only when its reading is the lesson's reading (ignoring spaces and case), so a
 * recording of another reading is never played under this pinyin.
 */
export function LessonWord({ hanzi, pinyin, meaning, record }: { hanzi: string; pinyin: string; meaning?: string | undefined; record?: Word | null | undefined }) {
  const fallback = useHanziTarget(hanzi);
  const target: HanziTarget | null = record === undefined ? fallback
    : record ? { kind: 'word', search: { tab: vocabularyKind(record), word: record.id }, audio: record.audio ?? null } : null;
  const sameReading = record ? spacing(record.pinyin) === spacing(pinyin) : true;
  const request: AudioRequest = target?.kind === 'word' ? { text: hanzi, reading: pinyin, audio: sameReading ? target.audio ?? null : null }
    : Array.from(hanzi).length === 1 ? characterAudioRequest(hanzi, pinyin) : { text: hanzi, reading: pinyin, audio: null };
  const head = target?.kind === 'glyph'
    ? <Link to="/characters" search={target.search} className="lesson-hanzi is-linked lesson-word-link" lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>
    : target?.kind === 'word'
      ? <Link to="/vocabulary" search={target.search} className="lesson-hanzi is-linked lesson-word-link" lang="zh-CN" title={openDetailsHint(hanzi, target.search.tab)}>{hanzi}</Link>
      : <span className="lesson-hanzi" lang="zh-CN">{hanzi}</span>;
  return <span className="lesson-term is-lg">
    {head}
    <span className="lesson-term-reading"><span className="pinyin">{pinyin}</span>{HAN_TEST.test(hanzi) && <ExamplePronunciation request={request} label={hanzi}/>}</span>
    {meaning && <span className="lesson-term-meaning"><LessonText text={meaning}/></span>}
  </span>;
}
