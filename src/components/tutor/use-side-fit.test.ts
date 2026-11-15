import { describe, expect, it } from 'vitest';
import { MAX_TRAILING_WORDS, MEANING_FONT_FLOOR, MEANING_FONT_STEPS, meaningFontSize, trailingWordCount } from './use-side-fit';

describe('meaningFontSize', () => {
  it('steps the translation one pixel at a time below the view size', () => {
    expect(meaningFontSize(12, 1)).toBe(11);
    expect(meaningFontSize(12, 2)).toBe(10);
    expect(meaningFontSize(18, 2)).toBe(16);
  });

  it('refuses a size below the floor', () => {
    expect(meaningFontSize(11, 2)).toBeNull();
    expect(meaningFontSize(MEANING_FONT_FLOOR, 1)).toBeNull();
  });

  it('keeps the search inside two steps and a 10px floor', () => {
    expect(MEANING_FONT_STEPS).toEqual([1, 2]);
    expect(MEANING_FONT_FLOOR).toBe(10);
  });
});

describe('trailingWordCount', () => {
  it('reads a last line as wide as its final word', () => {
    expect(trailingWordCount(40, [38, 80])).toBe(1);
  });

  it('reads a last line holding the final two words', () => {
    expect(trailingWordCount(78, [38, 80])).toBe(2);
  });

  it('reports more words than measured when the line is wider than both', () => {
    expect(trailingWordCount(120, [38, 80])).toBe(3);
  });

  it('only chases a last line of at most two words', () => {
    expect(MAX_TRAILING_WORDS).toBe(2);
    expect(trailingWordCount(120, [38, 80]) <= MAX_TRAILING_WORDS).toBe(false);
  });
});
