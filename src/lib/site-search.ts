import { referenceCatalog, type ReferenceKind } from './character-library';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';
import { radicalSearchGlyphs } from './radical-identities';
import { displayMeaning } from './glyph-presentation';
import { pinyinReadingMatches } from './pinyin-tones';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export type SearchHit =
  | { kind: 'Word'; word: Word }
  | { kind: ReferenceKind; hanzi: string; pinyin: string; meaning: string; note: string };

// Pinyin search modes shared with the library filters: 'pinyin' restricts the
// query to readings, 'exact' additionally requires the whole reading to match
// (tone numbers like `shi4` count as first-tone shi via pinyinReadingMatches).
export type GlobalPinyinMode = 'any' | 'pinyin' | 'exact';

export function searchAll(items: Word[], query: string, includeTraditional = false, limit = 20, pinyinMode: GlobalPinyinMode = 'any'): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];
  // In pinyin modes the hanzi/meaning free text is dropped so only readings decide.
  const wordMatch = pinyinMode === 'any'
    ? (w: Word) => normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.translation}`).includes(q) || pinyinReadingMatches(w.pinyin, query, false)
    : (w: Word) => pinyinReadingMatches(w.pinyin, query, pinyinMode === 'exact');
  const wordHits: SearchHit[] = items
    // Keep free-text discovery while sharing tone-number matching with library filters.
    .filter(w => includeScript(w.script, includeTraditional) && wordMatch(w))
    .map(word => ({ word, rank: normalize(word.hanzi) === q ? 0 : normalize(word.meaning).split(/[^a-z]+/).includes(q) ? 1 : normalize(`${word.hanzi} ${word.pinyin} ${word.meaning}`).includes(q) ? 2 : 3 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ word }) => ({ kind: 'Word' as const, word }));
  // Mirror the library filters: pinyin mode matches readings loosely, exact
  // mode only whole readings — no extra raw-text substring fallback.
  const refMatch = (pinyin: string) =>
    pinyinMode === 'any' ? normalize(pinyin).includes(q) : pinyin.split(/[,/;]/).some(reading => pinyinReadingMatches(reading, query, pinyinMode === 'exact'));
  const refHits: SearchHit[] = referenceCatalog.flatMap(({ kind, entries }) =>
    entries
      .filter(([hanzi, pinyin, meaning, note, script]) => includeScript(script, includeTraditional) && (normalize(`${hanzi} ${pinyin} ${meaning} ${note} ${radicalSearchGlyphs(hanzi).join(' ')}`).includes(q) || refMatch(pinyin)))
      .map(([hanzi, pinyin, meaning, note]) => ({ kind, hanzi, pinyin, meaning: displayMeaning(meaning), note })),
  );
  return [...refHits, ...wordHits].slice(0, limit);
}
