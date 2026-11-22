import { describe, expect, it } from 'vitest';
import { glyphCardInk, wordInk, wordRadicalNumber } from './card-ink';

describe('glyphCardInk', () => {
  it('colours traditional records purple before anything else', () => {
    expect(glyphCardInk('Characters', 'Traditional', true)).toBe('is-traditional');
  });
  it('colours radicals gold, whichever library they come from', () => {
    expect(glyphCardInk('Characters', 'Simplified', true)).toBe('card-ink-radical');
    expect(glyphCardInk('Components', undefined, true)).toBe('card-ink-radical');
    expect(glyphCardInk('Radicals', undefined, true)).toBe('card-ink-radical');
  });
  it('colours ordinary characters green and components in the text colour', () => {
    expect(glyphCardInk('Characters', 'Simplified', false)).toBe('card-ink-character');
    expect(glyphCardInk('Components', undefined, false)).toBe('card-ink-component');
  });
  it('leaves strokes uncoloured', () => {
    expect(glyphCardInk('Strokes', undefined, false)).toBe('');
  });
});

// Owner rule: radicals are always gold, everywhere — including one-character words that are
// themselves a radical, whose Words card carries the same Radical #N pill as the Characters card.
describe('wordInk / wordRadicalNumber', () => {
  it('gives the word 八 radical gold and the Radical #12 pill', () => {
    expect(wordInk({ hanzi: '八' })).toBe('card-ink-radical');
    expect(wordRadicalNumber('八')).toBe(12);
  });
  it('gives the simplified dual form 门 its Radical #169 pill', () => {
    expect(wordRadicalNumber('门')).toBe(169);
  });
  it('keeps multi-character words and ordinary characters uncoloured', () => {
    expect(wordInk({ hanzi: '八月' })).toBe('');
    expect(wordRadicalNumber('八月')).toBeUndefined();
    expect(wordInk({ hanzi: '我' })).toBe('');
    expect(wordRadicalNumber('我')).toBeUndefined();
  });
  it('lets Traditional purple win over radical gold', () => {
    expect(wordInk({ hanzi: '門', script: 'Traditional' })).toBe('is-traditional');
  });
});
