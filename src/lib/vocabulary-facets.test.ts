import { describe, expect, it } from 'vitest';
import { partOfSpeechList, vocabularyFacetOptions, vocabularyKind, words } from './mandarin';

const wordItems = words.filter(w => vocabularyKind(w) === 'word');
const all = { collection: 'All collections', level: 'All levels', pos: 'All types' };

describe('vocabularyFacetOptions', () => {
  it('narrows Types to the types recorded at the chosen level', () => {
    const level = 'Unclassified';
    const expected = [...new Set(wordItems.filter(w => w.level === level).flatMap(partOfSpeechList))].sort((a, b) => a.localeCompare(b));
    const facets = vocabularyFacetOptions(wordItems, { ...all, level });
    expect(facets.pos).toEqual(expected);
    expect(facets.pos.length).toBeLessThan(vocabularyFacetOptions(wordItems, all).pos.length);
  });
  it('narrows levels and collections to records of the chosen type', () => {
    const facets = vocabularyFacetOptions(wordItems, { ...all, pos: 'Verb' });
    for (const level of facets.levels) expect(wordItems.some(w => w.level === level && partOfSpeechList(w).includes('Verb'))).toBe(true);
    for (const c of facets.collections) expect(wordItems.some(w => w.collection === c && partOfSpeechList(w).includes('Verb'))).toBe(true);
  });
  it('never filters a dropdown by its own value and keeps the current pick listed', () => {
    const facets = vocabularyFacetOptions(wordItems, { ...all, level: 'Unclassified' });
    expect(facets.levels).toEqual(vocabularyFacetOptions(wordItems, all).levels);
    expect(vocabularyFacetOptions([], { ...all, pos: 'Verb' }).pos).toEqual(['Verb']);
  });
});
