import type { CharacterScript } from './learning-preferences';
import { speakTts, SLOW_RATE, NORMAL_RATE, type AudioAttachment } from './audio';
import { entryToWord, categoryName, vocabularyData, type Entry } from './data-contract';
export type Word = { id: string; hanzi: string; pinyin: string; meaning: string; type: string; collection: string; level: string; sentence: string; translation: string; sentencePinyin?: string; hskId?: number | null; script?: CharacterScript; audio?: AudioAttachment | null; entry?: Entry; entryKind?: 'word' | 'phrase' };
export const vocabularyKind = (word: Word): 'word' | 'phrase' => word.entry?.entryKind ?? word.entryKind ?? 'word';
// Real vocabulary imported from the Mandarin Tutor database, adapted through the API contract.
export const words: Word[] = vocabularyData.entries.map(e => entryToWord(e, vocabularyData.categories));
export const collections = vocabularyData.categories.map(c => categoryName(c.name)).filter(name => words.some(w => w.collection === name));
export function filterWords(items: Word[], query: string, collection = 'All collections', level = 'All levels', status = 'All words', saved: string[] = [], pinyinOnly = false) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = normalize(query.trim());
  return items.filter(w => normalize(pinyinOnly ? w.pinyin : `${w.hanzi} ${w.pinyin} ${w.meaning} ${w.type}`).includes(q) && (collection === 'All collections' || w.collection === collection) && (level === 'All levels' || w.level === level) && (status === 'All words' || saved.includes(w.id)));
}
/** Browser TTS only (last fallback); validated Mandarin voice. Prefer playPronunciation from ./audio. */
export function speak(text: string, slow = false) {
  return speakTts(text, slow ? SLOW_RATE : NORMAL_RATE).ok;
}
export const pageHead = (title: string, description: string) => ({ meta: [{ title: `${title} · Mandarin Tutor` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · Mandarin Tutor` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] });
