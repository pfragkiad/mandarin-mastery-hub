import { describe, expect, it } from 'vitest';
import { filterWords, matchesTopic, vocabularyFacetOptions, type Word } from './mandarin';
import { filterIdioms } from './idioms';

const base: Word = { id: 'empty', hanzi: '甲', pinyin: 'jiǎ', meaning: 'first', collection: '', type: 'Noun', level: 'HSK 3.0 · 1', sentence: '', translation: '' };
const records: Word[] = [base, { ...base, id: 'spaces', collection: ' ' }, { ...base, id: 'classified', collection: 'Animals & Weather' }, { ...base, id: 'secondary', collections: ['', 'Animals & Weather'] }];

describe('Unclassified topics', () => {
  it('matches only empty recorded topics, including blank-only lists', () => {
    expect(records.filter(word => matchesTopic(word, 'Unclassified')).map(word => word.id)).toEqual(['empty', 'spaces']);
  });
  it('filters libraries and idioms by the same missing-topic rule', () => {
    expect(filterWords(records, '', 'Unclassified').map(word => word.id)).toEqual(['empty', 'spaces']);
    expect(filterIdioms(records, [], '', 'All ranks', 'All words', [], false, false, false, 'Unclassified').map(word => word.id)).toEqual(['empty', 'spaces']);
  });
  it('keeps All topics unfiltered', () => {
    expect(filterWords(records, '', 'All collections')).toHaveLength(4);
    expect(records.filter(word => matchesTopic(word, ''))).toHaveLength(4);
  });
  it('narrows other dropdowns to unclassified records and offers the missing-topic facet', () => {
    const pool = [base, { ...base, id: 'classified', collection: 'Animals & Weather', level: 'HSK 3.0 · 2' }];
    expect(vocabularyFacetOptions(pool, { collection: 'Unclassified', level: 'All levels', pos: 'All types' }).levels).toEqual(['HSK 3.0 · 1']);
    expect(vocabularyFacetOptions(pool, { collection: 'All collections', level: 'All levels', pos: 'All types' }).collections).toContain('Unclassified');
  });
});