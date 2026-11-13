import { referenceCatalog, type ReferenceKind } from './character-library';
import { includeScript, type CharacterScript } from './learning-preferences';
import { vocabularyKind, type Word } from './mandarin';
import { usageRank } from './usage-frequency';
import { radicalSearchGlyphs } from './radical-identities';
import { displayMeaning } from './glyph-presentation';
import { pinyinReadingMatches } from './pinyin-tones';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Global search scans every word and catalogue row on each keystroke, so the
// normalized free text of each record is cached per record object (a WeakMap,
// so replaced or hydrated rows simply get fresh entries). Reference rows also
// remember the radical search glyphs they were built with and rebuild when the
// radical data loads later, so cached text never goes stale.
const wordText = new WeakMap<Word, { source: string; hanziPinyinMeaning: string; all: string; hanzi: string; meaningWords: string[] }>();
const wordSearchText = (w: Word) => {
  let text = wordText.get(w);
  // Session edits may replace a word's fields, so rebuild if the source text changed.
  if (!text || text.source !== `${w.hanzi}\u0000${w.pinyin}\u0000${w.meaning}\u0000${w.translation}`) {
    const meaning = normalize(w.meaning);
    text = { source: `${w.hanzi}\u0000${w.pinyin}\u0000${w.meaning}\u0000${w.translation}`, hanziPinyinMeaning: normalize(`${w.hanzi} ${w.pinyin} ${w.meaning}`), all: normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.translation}`), hanzi: normalize(w.hanzi), meaningWords: meaning.split(/[^a-z]+/) };
    wordText.set(w, text);
  }
  return text;
};
type RowText = { source: string[]; text: string; normalizedPinyin: string; readings: string[] };
const rowText = new WeakMap<object, RowText>();
const rowSearchText = (row: object, hanzi: string, pinyin: string, meaning: string, note: string) => {
  const glyphs = radicalSearchGlyphs(hanzi).join(' ');
  const source = [hanzi, pinyin, meaning, note, glyphs];
  let text = rowText.get(row);
  // Rebuild whenever any source field differs, so an in-place update is never missed.
  if (!text || text.source.some((value, index) => value !== source[index])) {
    text = { source, text: normalize(`${hanzi} ${pinyin} ${meaning} ${note} ${glyphs}`), normalizedPinyin: normalize(pinyin), readings: pinyin.split(/[,/;]/) };
    rowText.set(row, text);
  }
  return text;
};

export type SearchHit =
  | { kind: 'Word'; word: Word }
  | { kind: ReferenceKind; hanzi: string; pinyin: string; meaning: string; note: string; script?: CharacterScript };

// Pinyin search modes shared with the library filters: 'pinyin' restricts the
// query to readings, 'exact' additionally requires the whole reading to match
// (tone numbers like `shi4` count as fourth-tone shi via pinyinReadingMatches).
export type GlobalPinyinMode = 'any' | 'pinyin' | 'exact';

export function searchAll(items: Word[], query: string, includeTraditional = false, limit = 20, pinyinMode: GlobalPinyinMode = 'any'): SearchHit[] {
  const q = normalize(query.trim());
  if (!q) return [];
  // In pinyin modes the hanzi/meaning free text is dropped so only readings decide.
  const wordMatch = pinyinMode === 'any'
    ? (w: Word) => wordSearchText(w).all.includes(q) || pinyinReadingMatches(w.pinyin, query, false)
    : (w: Word) => pinyinReadingMatches(w.pinyin, query, pinyinMode === 'exact');
  const wordHits: SearchHit[] = items
    // Keep free-text discovery while sharing tone-number matching with library filters.
    .filter(w => includeScript(w.script, includeTraditional) && wordMatch(w))
    .map(word => { const text = wordSearchText(word); return { word, rank: text.hanzi === q ? 0 : text.meaningWords.includes(q) ? 1 : text.hanziPinyinMeaning.includes(q) ? 2 : 3 }; })
    .sort((a, b) => a.rank - b.rank)
    .map(({ word }) => ({ kind: 'Word' as const, word }));
  // Mirror the library filters: 'any' keeps loose tone-number reading matches on
  // top of free text; 'pinyin' matches readings loosely; 'exact' whole readings only.
  const refMatch = (text: RowText) =>
    pinyinMode === 'any'
      ? text.normalizedPinyin.includes(q) || text.readings.some(reading => pinyinReadingMatches(reading, query, false))
      : text.readings.some(reading => pinyinReadingMatches(reading, query, pinyinMode === 'exact'));
  const refHits: SearchHit[] = referenceCatalog.flatMap(({ kind, entries }) =>
    entries
      // Free-text fields belong only to unrestricted search; Pinyin/Exact must
      // not admit translation or source-note matches for reference entries.
      .filter(row => { const [hanzi, pinyin, meaning, note, script] = row; if (!includeScript(script, includeTraditional)) return false; const text = rowSearchText(row, hanzi, pinyin, meaning, note); return refMatch(text) || (pinyinMode === 'any' && text.text.includes(q)); })
      .map(([hanzi, pinyin, meaning, note, script]) => ({ kind, hanzi, pinyin, meaning: displayMeaning(meaning), note, ...(script ? { script } : {}) })),
  );
  // Words lead, phrases follow all glyphs. Compare the recorded numeric ranks
  // across glyph kinds rather than letting catalogue groups dictate priority.
  // Unranked glyphs stay last within that middle group; ties stay source-ordered.
  const rank = (hit: SearchHit): number => {
    if (hit.kind === 'Word') return Infinity;
    const kind = hit.kind === 'Character' ? 'Characters' : hit.kind === 'Component' ? 'Components' : 'Radicals';
    const kangxiIndex = hit.kind === 'Radical' ? Number(hit.note.match(/\bRadical #(\d+)\b/i)?.[1]) : undefined;
    return usageRank({ id: `${kind}:${hit.hanzi}`, hanzi: hit.hanzi, ...(kangxiIndex !== undefined ? { kangxiIndex } : {}) }, kind, includeTraditional) ?? Infinity;
  };
  const rankedRefs = refHits.map(hit => ({ hit, rank: rank(hit) }))
    .sort((a, b) => a.rank - b.rank).map(({ hit }) => hit);
  const words = wordHits.filter(hit => hit.kind === 'Word' && vocabularyKind(hit.word) === 'word');
  const phrases = wordHits.filter(hit => hit.kind === 'Word' && vocabularyKind(hit.word) === 'phrase');
  return [...words, ...rankedRefs, ...phrases].slice(0, limit);
}
