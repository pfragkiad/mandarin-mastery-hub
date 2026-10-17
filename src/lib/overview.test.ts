import { describe, expect, it } from 'vitest';
import { words, vocabularyKind } from './mandarin';
import { randomOverviewWord, overviewWordDestination, randomOverviewCharacter, overviewCharacterDestination } from './overview';
import { type LibraryEntry } from './character-library';
import { defaultPreferences, restoredTheme } from './learning-preferences';

describe('Overview featured words', () => {
  it('selects a real word, never an unofficial phrase', () => {
    for (const value of [0, 0.2, 0.5, 0.999]) {
      const word = randomOverviewWord(words, undefined, () => value);
      expect(word).toBeDefined();
      if (!word) throw new Error('Expected imported word');
      expect(words.some(entry => entry.id === word.id)).toBe(true);
      expect(vocabularyKind(word)).toBe('word');
    }
  });
  it('another word never immediately repeats with multiple candidates', () => {
    const first = randomOverviewWord(words, undefined, () => 0);
    const second = randomOverviewWord(words, first?.id, () => 0);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second?.id).not.toBe(first?.id);
  });
  it('handles empty and one-word libraries', () => {
    expect(randomOverviewWord([])).toBeUndefined();
    const first = words.find(word => vocabularyKind(word) === 'word');
    if (!first) throw new Error('Expected imported word');
    expect(randomOverviewWord([first], first.id)?.id).toBe(first.id);
  });
  it('dictionary destinations select the exact record without filtering vocabulary', () => {
    const word = randomOverviewWord(words, undefined, () => 0.5);
    if (!word) throw new Error('Expected imported word');
    expect(overviewWordDestination(word)).toEqual({ word: word.id, tab: 'word' });
  });
});
describe('First visit defaults', () => {
  it('starts in dark theme without a saved choice', () => { expect(restoredTheme(null)).toBe('dark'); });
  it('starts with handwritten Kai characters', () => { expect(defaultPreferences.font).toBe('Handwritten'); });
  it('preserves returning visitors saved themes', () => {
    expect(restoredTheme('light')).toBe('light');
    expect(restoredTheme('dark')).toBe('dark');
  });
});

describe('Overview random characters', () => {
  const entries: LibraryEntry[] = Array.from({ length: 50 }, (_, i) => ({ id: `Characters:${i}`, hanzi: String(i), pinyin: '', meaning: '', note: '', script: i === 0 ? 'Traditional' : 'Common' }));
  it('respects the traditional-character preference', () => {
    expect(randomOverviewCharacter(entries, false, undefined, () => 0)?.id).toBe('Characters:1');
    expect(randomOverviewCharacter(entries, true, undefined, () => 0)?.id).toBe('Characters:0');
  });
  it('does not repeat the previous character when alternatives exist', () => {
    expect(randomOverviewCharacter(entries, false, 'Characters:1', () => 0)?.id).toBe('Characters:2');
  });
  it('opens the exact character tab, record and filtered page', () => {
    const entry = entries[49];
    if (!entry) throw new Error('Expected character');
    expect(overviewCharacterDestination(entry, entries, false)).toEqual({ tab: 'Characters', id: 'Characters:49', page: 2 });
  });
  it('handles an empty catalogue without inventing a character', () => {
    expect(randomOverviewCharacter([])).toBeUndefined();
  });
});