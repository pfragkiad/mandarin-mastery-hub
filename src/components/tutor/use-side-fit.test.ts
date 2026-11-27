import { describe, expect, it } from 'vitest';
import { MAX_TRAILING_WORDS, MEANING_FONT_FLOOR, MEANING_FONT_STEPS, meaningFontSize, trailingWordCount, synchronizedRowStacks, synchronizedGridStacks } from './use-side-fit';

describe('detail grid stacking', () => {
  it('stacks every card, including other rows, when any card needs to wrap', () => {
    expect(synchronizedGridStacks([
      { stacked: false }, { stacked: false }, { stacked: true }, { stacked: false },
    ])).toEqual([true, true, true, true]);
  });

  it('reconsiders the visible cards after Show fewer removes the wrapping card', () => {
    const visible = [{ stacked: false }, { stacked: false }];
    expect(synchronizedGridStacks([...visible, { stacked: true }])).toEqual([true, true, true]);
    expect(synchronizedGridStacks(visible)).toEqual([false, false]);
  });
});

describe('shared grid row stacking', () => {
  it('stacks every companion of a wrapped card without changing other rows', () => {
    expect(synchronizedRowStacks([
      { top: 100, stacked: true }, { top: 100.2, stacked: false },
      { top: 220, stacked: false }, { top: 220, stacked: false },
    ])).toEqual([true, true, false, false]);
  });

  it('restores side layouts when no card needs wrapping after resizing or filtering', () => {
    expect(synchronizedRowStacks([
      { top: 100, stacked: false }, { top: 100, stacked: false },
    ])).toEqual([false, false]);
  });
});

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
    expect(trailingWordCount(38, [38, 80])).toBe(1);
    expect(trailingWordCount(39, [38, 80])).toBe(1);
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

describe('side text shrink before stacking', () => {
  it('takes at most a few pixels off, never below the floor', async () => {
    const { sideTextMaxStep } = await import('./use-side-fit');
    expect(sideTextMaxStep(18)).toBe(4);
    expect(sideTextMaxStep(12)).toBe(2);
    expect(sideTextMaxStep(11)).toBe(1);
    expect(sideTextMaxStep(10)).toBe(0);
  });
});
