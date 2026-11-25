import { useCallback, useMemo } from 'react';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { segmentLessonExpression } from '@/lib/lesson-segments';
import { useWorkspace } from './workspace';

/**
 * The one shared words-first rule for recorded Chinese text (lesson lines and every
 * "In a sentence" example on detail cards), so grouping and navigation never drift.
 *
 * Returns `wordFor` (an exact, unique Vocabulary headword — one-character words too (owner-requested: 我's word entry carries HSK/lesson content, so it outranks the plain character), else null) and
 * `wordsFor` (per Array.from(text) index: the identified word the character sits in —
 * whole text first, else greedy longest unique headword via lesson-segments.ts — or null).
 * Full sentences pass wholeFirst=false: a sentence recorded as its own phrase entry
 * (我有八本书。) still groups by the words inside it, not as one block.
 * Ambiguous headwords never match, so no identity is guessed; presentation only.
 */
export type SentenceWord = { hanzi: string; pinyin: string; meaning: string; search: { tab: 'word' | 'idiom' | 'phrase'; word: string }; audio: Word['audio'] };

export function useSentenceWords() {
  const { items } = useWorkspace();
  const words = useMemo(() => {
    const map = new Map<string, Word | null>();
    for (const w of items) map.set(w.hanzi, map.has(w.hanzi) ? null : w);
    return map;
  }, [items]);
  const wordFor = useCallback((hanzi: string): SentenceWord | null => {
    const w = words.get(hanzi);
    return w ? { hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, search: { tab: vocabularyKind(w), word: w.id }, audio: w.audio ?? null } : null;
  }, [words]);
  // `exclude` (optional): one headword never matched — a phrase's own heading is split into
  // the words it contains instead of matching itself as one block.
  const wordsFor = useCallback((text: string, wholeFirst = true, exclude?: string): (SentenceWord | null)[] => {
    const whole = wholeFirst ? wordFor(text) : null;
    if (whole) return Array.from(text).map(() => whole);
    const out: (SentenceWord | null)[] = [];
    for (const seg of segmentLessonExpression(text, h => (h === exclude ? null : words.get(h)?.id ?? null))) {
      const w = seg.kind === 'word' ? wordFor(seg.text) : null;
      for (const _ of Array.from(seg.text)) out.push(w);
    }
    return out;
  }, [wordFor, words]);
  return { wordFor, wordsFor };
}
