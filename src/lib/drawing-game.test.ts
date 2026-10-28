import { describe, expect, it } from 'vitest';
import { drawingPool, drawingWordPool, drawingWordClues, drawingSearch, mistakeOutcome, shuffledDrawingDeck } from './drawing-game';
import { words } from './mandarin';
import type { Word } from './mandarin';
import { libraryEntries, type LibraryEntry } from './character-library';

const entries: LibraryEntry[] = [
  { id: 'a', hanzi: '一', pinyin: 'yī', meaning: 'one', note: '', strokes: 1, reuseCount: 150 },
  { id: 'b', hanzi: '人', pinyin: 'rén', meaning: 'person', note: '', strokes: 2, reuseCount: 30 },
  { id: 'c', hanzi: '口', pinyin: 'kǒu', meaning: 'mouth', note: '', strokes: 3, reuseCount: 6 },
  { id: 'd', hanzi: '木', pinyin: 'mù', meaning: 'wood', note: '', strokes: 4, reuseCount: 2 },
  { id: 'e', hanzi: '丨', pinyin: 'gǔn', meaning: 'line', note: '', strokes: 1, reuseCount: 0 },
];
describe('drawing game rules', () => {
  it('hides 一 while keeping 些 and both recorded word-context readings', () => {
    const word = words.find(word => word.hanzi === '一些');
    if (!word) throw new Error('Missing imported 一些');
    expect(drawingWordClues({ id: word.id, hanzi: '一', pinyin: word.pinyin, meaning: word.meaning, note: '', word, characterIndex: 0 })).toEqual([
      { glyph: '', pinyin: 'yì', selected: true, index: 0 }, { glyph: '些', pinyin: 'xiē', selected: false, index: 1 },
    ]);
  });
  it('never substitutes standalone readings when word tokens are missing', () => {
    const word: Word = { id: 'x', hanzi: '一些', pinyin: 'yì xiē', meaning: 'some', collection: '', level: '', type: '', sentence: '', translation: '' };
    expect(drawingWordClues({ ...entries[0], id: word.id, hanzi: '一', pinyin: word.pinyin, meaning: word.meaning, note: '', word, characterIndex: 0 }).map(clue => clue.pinyin)).toEqual(['', '']);
  });
  const word: Word = { id: 'word-hello', hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello', collection: 'Greetings', level: 'HSK 1', type: '', sentence: '', translation: '', entryKind: 'word' };
  it('selects Words by collection', () => {
    expect(drawingWordPool([word, { ...word, id: 'other', collection: 'Food' }], { kind: 'Words', collection: 'Greetings' }, false).map(card => card.id)).toEqual(['word-hello']);
  });
  it('selects Words by level', () => {
    expect(drawingWordPool([word, { ...word, id: 'other', level: 'HSK 2' }], { kind: 'Words', level: 'HSK 1' }, false).map(card => card.id)).toEqual(['word-hello']);
  });
  it('selects a random character occurrence within a random word and retains it for review', () => {
    const pool = drawingWordPool([word], { kind: 'Words' }, false);
    const original = Math.random;
    try {
      Math.random = () => 0.99;
      const dealt = shuffledDrawingDeck(pool, 1);
      expect(dealt[0]).toMatchObject({ id: 'word-hello', hanzi: '好', characterIndex: 1, word });
      Math.random = () => 0;
      expect(shuffledDrawingDeck(dealt, 1)[0]).toEqual(dealt[0]);
      expect(shuffledDrawingDeck(pool, 1)[0]).toMatchObject({ hanzi: '你', characterIndex: 0 });
      expect(pool[0]?.characterIndex).toBeUndefined();
    } finally { Math.random = original; }
  });
  it('keeps phrases out of Words regardless of their length', () => {
    expect(drawingWordPool([word, { ...word, id: 'phrase', entryKind: 'phrase' }], { kind: 'Words' }, false).map(card => card.id)).toEqual(['word-hello']);
  });
  it('preserves word filters in the URL only in Words mode', () => {
    expect(drawingSearch({ kind: 'Words', collection: 'Greetings', level: 'HSK 1', strokes: '2' })).toEqual({ kind: 'Words', collection: 'Greetings', level: 'HSK 1' });
    expect(drawingSearch({ kind: 'Characters', collection: 'Greetings', level: 'HSK 1' })).toEqual({ kind: 'Characters' });
  });
  it.each(['Radicals', 'Components'] as const)('filters %s by recorded stroke count', kind => {
    expect(drawingPool(entries, { kind, strokes: '1' }, false).map(entry => entry.id)).toEqual(['a', 'e']);
  });
  it.each(['Radicals', 'Components'] as const)('uses the same sourced usage categories for %s', kind => {
    expect(drawingPool(entries, { kind, usage: 'very-frequent' }, false).map(entry => entry.id)).toEqual(['a']);
    expect(drawingPool(entries, { kind, usage: 'frequent' }, false).map(entry => entry.id)).toEqual(['b']);
    expect(drawingPool(entries, { kind, usage: 'moderate' }, false).map(entry => entry.id)).toEqual(['c']);
    expect(drawingPool(entries, { kind, usage: 'less-frequent' }, false).map(entry => entry.id)).toEqual(['d']);
    expect(drawingPool(entries, { kind, usage: 'unrecorded' }, false).map(entry => entry.id)).toEqual(['e']);
  });
  it('combines radical/component stroke and usage filters', () => {
    expect(drawingPool(entries, { kind: 'Components', strokes: '1', usage: 'very-frequent' }, false).map(entry => entry.id)).toEqual(['a']);
  });
  it('does not carry radical/component filters into characters', () => {
    expect(drawingSearch({ kind: 'Characters', strokes: '1', usage: 'frequent' })).toEqual({ kind: 'Characters' });
    expect(drawingPool(entries, { kind: 'Characters', strokes: '1', usage: 'frequent' }, false)).toHaveLength(5);
  });
  it('requires recorded pinyin and translation, never fabricated clues', () => {
    expect(drawingPool([{ ...entries[0], id: 'none', hanzi: '一', pinyin: '', meaning: 'one', note: '' }, { ...entries[1], id: 'no-meaning', hanzi: '人', pinyin: 'rén', meaning: '', note: '' }], {}, false)).toEqual([]);
    expect(drawingPool(libraryEntries('Radicals'), { kind: 'Radicals' }, false).every(entry => entry.pinyin && entry.meaning)).toBe(true);
  });
  it('respects explicit traditional preferences', () => {
    const traditional: LibraryEntry = { id: 't', hanzi: '國', pinyin: 'guó', meaning: 'country', note: '', script: 'Traditional' };
    expect(drawingPool([traditional], {}, false)).toEqual([]);
    expect(drawingPool([traditional], {}, true)).toEqual([traditional]);
  });
  it('allows errors to retry and rejects the first error when disabled', () => {
    expect(mistakeOutcome(true)).toBe('drawing');
    expect(mistakeOutcome(false)).toBe('missed');
  });
  it('creates nonrepeating bounded rounds without mutating the catalogue', () => {
    const before = [...entries];
    const deck = shuffledDrawingDeck(entries, 3);
    expect(deck).toHaveLength(3);
    expect(new Set(deck.map(entry => entry.id)).size).toBe(3);
    expect(entries).toEqual(before);
  });
});