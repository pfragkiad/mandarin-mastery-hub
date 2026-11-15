import { Fragment, useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { libraryDestination } from '@/lib/character-library';
import { characterAudioRequest } from '@/lib/catalog-store';
import { vocabularyKind } from '@/lib/mandarin';
import { openDetailsHint } from '@/lib/tile-hints';
import { useWorkspace } from './workspace';
import { ExamplePronunciation } from './example-pronunciation';
import { HintGlyphs, useLessonHints } from './lesson-hints';
import type { AudioRequest } from '@/lib/audio';

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
 *
 * Inside a lesson page (LessonHintsProvider) LessonText and LessonHanzi hand every Han
 * character to the lesson character hints (lesson-hints.tsx) instead: a hover ring and a
 * click-to-open quick card while hints are on, plain text (no link) while they are off.
 * Prose runs are mouse/touch targets only (not tab stops), so a long lesson never fills
 * the keyboard order with hundreds of characters; recorded hanzi fields stay focusable.
 */

const HAN = /(\p{Script=Han}+)/u;
const HAN_TEST = /^\p{Script=Han}+$/u;

export function LessonText({ text }: { text: string | null | undefined }) {
  const hints = useLessonHints();
  if (!text) return null;
  // Split on *emphasis* first, then mark Han runs inside every piece.
  return <>{text.split(/(\*[^*\n]+\*)/).map((piece, i) => {
    const emphasis = /^\*[^*\n]+\*$/.test(piece);
    const body = (emphasis ? piece.slice(1, -1) : piece).split(HAN).map((part, j) => HAN_TEST.test(part) ? <span key={j} lang="zh-CN" className="lesson-inline-hanzi">{hints ? <HintGlyphs text={part} focusable={false}/> : part}</span> : <Fragment key={j}>{part}</Fragment>);
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
  return <span className={`lesson-term is-${size}`}>
    <LessonHanzi hanzi={hanzi}/>
    {pinyin && <span className="lesson-term-reading"><span className="pinyin">{pinyin}</span><LessonSpeaker hanzi={hanzi} pinyin={pinyin}/></span>}
    {meaning && <span className="lesson-term-meaning"><LessonText text={meaning}/></span>}
    {after}
  </span>;
}
