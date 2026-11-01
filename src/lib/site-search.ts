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

export function searchAll(items: Word[], query: string, includeTraditional = false, limit = 20): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const wordHits: SearchHit[] = items
    // Keep free-text discovery while sharing tone-number matching with library filters.
    .filter(w => includeScript(w.script, includeTraditional) && (normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.translation}`).includes(q) || pinyinReadingMatches(w.pinyin, query, false)))
    .map(word => ({ word, rank: normalize(word.hanzi) === q ? 0 : normalize(word.meaning).split(/[^a-z]+/).includes(q) ? 1 : normalize(`${word.hanzi} ${word.pinyin} ${word.meaning}`).includes(q) ? 2 : 3 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ word }) => ({ kind: 'Word' as const, word }));
  const refHits: SearchHit[] = referenceCatalog.flatMap(({ kind, entries }) =>
    entries
      .filter(([hanzi, pinyin, meaning, note, script]) => includeScript(script, includeTraditional) && (normalize(`${hanzi} ${pinyin} ${meaning} ${note} ${radicalSearchGlyphs(hanzi).join(' ')}`).includes(q) || pinyin.split(/[,/;]/).some(reading => pinyinReadingMatches(reading, query, false))))
      .map(([hanzi, pinyin, meaning, note]) => ({ kind, hanzi, pinyin, meaning: displayMeaning(meaning), note })),
  );
  return [...refHits, ...wordHits].slice(0, limit);
}
