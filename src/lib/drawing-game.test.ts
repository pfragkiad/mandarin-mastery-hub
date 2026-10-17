import { describe, expect, it } from 'vitest';
import { drawingPool, drawingSearch, mistakeOutcome, shuffledDrawingDeck } from './drawing-game';
import { libraryEntries, type LibraryEntry } from './character-library';

const entries: LibraryEntry[] = [
  { id: 'a', hanzi: '一', pinyin: 'yī', meaning: 'one', note: '', strokes: 1, reuseCount: 150 },
  { id: 'b', hanzi: '人', pinyin: 'rén', meaning: 'person', note: '', strokes: 2, reuseCount: 30 },
  { id: 'c', hanzi: '口', pinyin: 'kǒu', meaning: 'mouth', note: '', strokes: 3, reuseCount: 6 },
  { id: 'd', hanzi: '木', pinyin: 'mù', meaning: 'wood', note: '', strokes: 4, reuseCount: 2 },
  { id: 'e', hanzi: '丨', pinyin: 'gǔn', meaning: 'line', note: '', strokes: 1, reuseCount: 0 },
];
describe('drawing game rules', () => {
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
    const traditional: LibraryEntry = { id: 't', hanzi: '國', pinyin: 'guó', meaning: 'country', note: '', script: 'traditional' };
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