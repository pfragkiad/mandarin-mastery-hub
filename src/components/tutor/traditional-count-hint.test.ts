import { describe, expect, it } from 'vitest';
import { traditionalCountHint } from './characters-page';

describe('traditionalCountHint', () => {
  it('names Traditional forms that keep their own card alongside shared ones', () => {
    expect(traditionalCountHint(2005, 105, 7532)).toBe('2,005 Traditional forms share a card with their Simplified form. 105 other Traditional forms have no linked Simplified form and keep their own card, included in the 7,532');
  });
  it('omits the standalone sentence when every Traditional form is paired', () => {
    expect(traditionalCountHint(3, 0, 10)).toBe('3 Traditional forms share a card with their Simplified form');
  });
});
