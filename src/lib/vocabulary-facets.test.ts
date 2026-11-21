import { describe, expect, it } from 'vitest';
import { partOfSpeechList, vocabularyFacetOptions, vocabularyKind, wordCollections, words } from './mandarin';
import { phraseStyle } from './data-contract';

const wordItems = words.filter(w => vocabularyKind(w) === 'word');
const all = { collection: 'All collections', level: 'All levels', pos: 'All types' };

describe('vocabularyFacetOptions', () => {
  it('narrows Types to the types recorded at the chosen level', () => {
    const level = 'HSK 3.0 · 2';
    const expected = [...new Set(wordItems.filter(w => w.level === level).flatMap(partOfSpeechList))].sort((a, b) => a.localeCompare(b));
    const facets = vocabularyFacetOptions(wordItems, { ...all, level });
    expect(facets.pos).toEqual(expected);
    expect(facets.pos.length).toBeLessThan(vocabularyFacetOptions(wordItems, all).pos.length);
  });
  it('narrows levels and collections to records of the chosen type', () => {
    const facets = vocabularyFacetOptions(wordItems, { ...all, pos: 'Verb' });
    for (const level of facets.levels) expect(wordItems.some(w => w.level === level && partOfSpeechList(w).includes('Verb'))).toBe(true);
    for (const c of facets.collections) expect(wordItems.some(w => wordCollections(w).includes(c) && partOfSpeechList(w).includes('Verb'))).toBe(true);
  });
  it('never filters a dropdown by its own value and keeps the current pick listed', () => {
    const facets = vocabularyFacetOptions(wordItems, { ...all, level: 'HSK 3.0 · 1' });
    expect(facets.levels).toEqual(vocabularyFacetOptions(wordItems, all).levels);
    expect(vocabularyFacetOptions([], { ...all, pos: 'Verb' }).pos).toEqual(['Verb']);
  });
  it('narrows Sentence styles by the chosen level, and levels by the chosen style', () => {
    const phrases = words.filter(w => vocabularyKind(w) === 'phrase');
    const level = 'HSK 3.0 · 1';
    const expected = ['Conversational', 'Written', 'Unclassified'].filter(st => phrases.some(w => w.level === level && phraseStyle(w.entry) === st));
    expect(vocabularyFacetOptions(phrases, { ...all, level }).styles).toEqual(expected);
    // HSK 1 sentences all carry a recorded style, so Unclassified is not offered there.
    expect(expected).not.toContain('Unclassified');
    const unclassifiedLevels = vocabularyFacetOptions(phrases, { ...all, style: 'Unclassified' }).levels;
    for (const l of unclassifiedLevels) expect(phrases.some(w => w.level === l && phraseStyle(w.entry) === 'Unclassified')).toBe(true);
    expect(unclassifiedLevels).not.toContain(level);
  });
});
