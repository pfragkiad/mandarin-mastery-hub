import { describe, it, expect } from 'vitest';
import { entryToWord, fixtureEntries, fixtureCategories, posLabel, levelLabel, vocabularyData, orderExamples, sentencePhraseEntries, phraseStyle, matchesPhraseStyle, alignSentenceEnding, examplePinyin } from './data-contract';
import type { Example } from './data-contract';
describe('Entry adapter', () => {
  const w = entryToWord(fixtureEntries[0]!, fixtureCategories);
  it('keeps the server UUID as identity', () => { expect(w.id).toBe('5b1d3c2a-0000-4000-8000-000000000289'); });
  it('shows a missing part of speech as Unspecified', () => { expect(w.type).toBe('Unspecified'); expect(posLabel(null)).toBe('Unspecified'); });
  it('formats a versioned HSK level and Unclassified', () => { expect(w.level).toBe('HSK 3.0 · 1'); expect(levelLabel({ hskLevel: null, hskVersion: null })).toBe('Unclassified'); });
  it('does not invent an example from the headword', () => { expect(w.sentence).toBe(''); });
  it('renders sentence punctuation with Latin equivalents, not Chinese full stops', () => {
    const withExample = vocabularyData.entries.filter(e => e.examples[0]?.tokens.some(tok => tok.text === '。'));
    expect(withExample.length).toBeGreaterThan(0);
    for (const e of withExample.slice(0, 50)) {
      const pinyin = entryToWord(e, vocabularyData.categories).sentencePinyin ?? '';
      expect(pinyin, `${e.simplified} pinyin "${pinyin}"`).not.toMatch(/[。！？，、；：]/);
      expect(pinyin.endsWith('.')).toBe(true);
    }
  });
});

describe('orderExamples', () => {
  const ex = (id: string, style?: 'conversational' | 'written') => ({ id, simplified: id, english: id, tokens: [], style }) as unknown as Example;
  it('puts conversational sentences first, keeping recorded order within each style', () => {
    const ordered = orderExamples([ex('w1', 'written'), ex('c1', 'conversational'), ex('w2', 'written'), ex('c2', 'conversational')]);
    expect(ordered.map((e: { id: string }) => e.id)).toEqual(['c1', 'c2', 'w1', 'w2']);
  });
  it('leaves a single-style list in recorded order and does not mutate the source', () => {
    const source = [ex('a', 'written'), ex('b', 'written')];
    expect(orderExamples(source).map((e: { id: string }) => e.id)).toEqual(['a', 'b']);
    expect(source.map((e: { id: string }) => e.id)).toEqual(['a', 'b']);
  });
  it('makes the card-face sentence the first conversational example', () => {
    const entry = vocabularyData.entries.find(e => e.examples.some(x => x.style === 'conversational') && e.examples[0]?.style !== 'conversational');
    if (entry) expect(entryToWord(entry, vocabularyData.categories).sentence).toBe(orderExamples(entry.examples)[0]!.simplified);
  });
});

describe('phrase style filter (Phrases library and Flashcards)', () => {
  const phrases = [...vocabularyData.entries, ...sentencePhraseEntries(vocabularyData.entries)].filter(e => e.entryKind === 'phrase');
  const bySimplified = (text: string) => phrases.find(e => e.simplified === text);
  it('a sentence phrase keeps its recorded style', () => {
    const written = phrases.find(e => e.sentenceSource?.style === 'written')!;
    expect(matchesPhraseStyle(written, 'Written')).toBe(true);
    expect(matchesPhraseStyle(written, 'Conversational')).toBe(false);
  });
  it('a syllabus phrase without a style tag is Unclassified', () => {
    expect(phraseStyle(bySimplified('不好意思'))).toBe('Unclassified');
    expect(matchesPhraseStyle(bySimplified('不好意思'), 'Unclassified')).toBe(true);
  });
  it('a standalone phrase with a style tag uses it', () => {
    expect(phraseStyle({ ...bySimplified('我受够了')!, style: 'conversational' })).toBe('Conversational');
  });
  it('no style keeps every phrase', () => {
    expect(phrases.every(e => matchesPhraseStyle(e, '') && matchesPhraseStyle(e, 'All styles'))).toBe(true);
  });
});
