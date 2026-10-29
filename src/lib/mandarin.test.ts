import { describe, it, expect } from 'vitest';
import { words, filterWords, collections, partOfSpeechList, partOfSpeechOptions } from './mandarin';
describe('Vocabulary filtering', () => {
 it('loads all 745 imported vocabulary entries', () => { expect(words).toHaveLength(745); });
 it('finds pinyin without requiring tone marks', () => { expect(filterWords(words,'ni hao').map(w => w.hanzi)).toContain('你好'); });
 it('can restrict the search to pinyin only', () => {
   expect(filterWords(words, 'shui', 'All collections', 'All levels', 'All words', [], true).map(w => w.hanzi)).toContain('水');
   expect(filterWords(words, 'water', 'All collections', 'All levels', 'All words', [], true).map(w => w.hanzi)).not.toContain('水');
 });
 it('restricts results to saved words', () => { const id = words[0]!.id; expect(filterWords(words,'','All collections','All levels','Saved words',[id]).map(w => w.id)).toEqual([id]); });
 it('shows category names without the sort prefix', () => { expect(collections).toContain('Numbers & quantities'); });
 it('every imported word carries a recorded part of speech', () => { expect(words.every(w => w.type.trim())).toBe(true); });
 it('filters by base part of speech, matching combos and ignoring sense notes and case', () => {
   const verbs = filterWords(words, '', 'All collections', 'All levels', 'All words', [], false, 'Verb');
   expect(verbs.length).toBeGreaterThan(0);
   expect(verbs.every(w => partOfSpeechList(w).includes('Verb'))).toBe(true);
   expect(verbs.some(w => w.type.includes('/'))).toBe(true);
   expect(filterWords(words, '', 'All collections', 'All levels', 'All words', [], false, 'Pronoun').some(w => w.type === 'pronoun')).toBe(true);
 });
 it('lists each base part of speech once in the filter options', () => {
   const options = partOfSpeechOptions(words);
   expect(options).toContain('Verb');
   expect(options).toContain('Measure word');
   expect(new Set(options).size).toBe(options.length);
   expect(options.some(o => o.includes('(additional sense)'))).toBe(false);
 });
});
