import type { CharacterScript } from './learning-preferences';
import { pinyinReadingMatches } from './pinyin-tones';
import { speakTts, SLOW_RATE, NORMAL_RATE, type AudioAttachment } from './audio';
import { entryToWord, categoryName, vocabularyData, type Entry } from './data-contract';
export type Word = { id: string; hanzi: string; pinyin: string; meaning: string; type: string; collection: string; level: string; sentence: string; translation: string; sentencePinyin?: string; hskId?: number | null; script?: CharacterScript; audio?: AudioAttachment | null; entry?: Entry; entryKind?: 'word' | 'phrase' };
export const vocabularyKind = (word: Word): 'word' | 'phrase' => word.entry?.entryKind ?? word.entryKind ?? 'word';
// Real vocabulary imported from the Mandarin Tutor database, adapted through the API contract.
export const words: Word[] = vocabularyData.entries.map(e => entryToWord(e, vocabularyData.categories));
export const collections = vocabularyData.categories.map(c => categoryName(c.name)).filter(name => name !== 'Sample collection' && words.some(w => w.collection === name)).sort((a, b) => a.localeCompare(b));
/** Collections that actually contain records of the given list (e.g. only Words or only Phrases), keeping the global order. */
export const collectionOptions = (items: Word[]): string[] => collections.filter(name => items.some(w => w.collection === name));
/** Base part-of-speech labels of a word: split recorded combos, drop "(additional sense)" notes, normalize case. */
export const partOfSpeechList = (word: Word): string[] => (word.type ?? "").split('/').map(part => part.replace(/\(additional sense\)/i, '').trim()).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1));
export function partOfSpeechOptions(items: Word[]): string[] { return [...new Set(items.flatMap(partOfSpeechList))].sort((a, b) => a.localeCompare(b)); }
// pinyinExact (only with pinyinOnly) requires the whole tone-stripped reading
// to equal the query — "yisi" matches 意思, but "yi" no longer does.
// Tone numbers are accepted too: "yi4si" matches 意思 (yìsi) directly.
export function filterWords(items: Word[], query: string, collection = 'All collections', level = 'All levels', status = 'All words', saved: string[] = [], pinyinOnly = false, pos = 'All types', pinyinExact = false) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = normalize(query.trim());
  // Plain mode keeps the free-text match and adds the same pinyin fallback as
  // global search, so tone-number input ("shi4") still finds 是 (shì).
  const matches = (w: Word) => pinyinOnly ? pinyinReadingMatches(w.pinyin, query, pinyinExact) : normalize(`${w.hanzi} ${w.pinyin} ${w.meaning} ${w.type}`).includes(q) || pinyinReadingMatches(w.pinyin, query, false);
  return items.filter(w => matches(w) && (collection === 'All collections' || w.collection === collection) && (level === 'All levels' || w.level === level) && (status === 'All words' || saved.includes(w.id)) && (pos === 'All types' || partOfSpeechList(w).includes(pos)));
}
/**
 * Faceted dropdown options for Vocabulary: each list (collection, level, type)
 * only offers values that still have records under the *other* current
 * choices, so picking "Unclassified" narrows Types to what exists there.
 * A dropdown never filters by its own value (so you can still switch it), and
 * the current selection always stays listed so the select never goes blank.
 */
export function vocabularyFacetOptions(items: Word[], selection: { collection: string; level: string; pos: string }) {
  const { collection, level, pos } = selection;
  const inCollection = (w: Word) => collection === 'All collections' || w.collection === collection;
  const inLevel = (w: Word) => level === 'All levels' || w.level === level;
  const inPos = (w: Word) => pos === 'All types' || partOfSpeechList(w).includes(pos);
  const keep = (options: string[], current: string, all: string) => current === all || options.includes(current) ? options : [...options, current];
  const levelSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  return {
    collections: keep(collectionOptions(items.filter(w => inLevel(w) && inPos(w))), collection, 'All collections'),
    levels: keep([...new Set(items.filter(w => inCollection(w) && inPos(w)).map(w => w.level))].sort(levelSort), level, 'All levels'),
    pos: keep(partOfSpeechOptions(items.filter(w => inCollection(w) && inLevel(w))), pos, 'All types'),
  };
}
/** Browser TTS only (last fallback); validated Mandarin voice. Prefer playPronunciation from ./audio. */
export function speak(text: string, slow = false) {
  return speakTts(text, slow ? SLOW_RATE : NORMAL_RATE).ok;
}
export const pageHead = (title: string, description: string) => ({ meta: [{ title: `${title} · Mandarin Tutor` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · Mandarin Tutor` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] });
