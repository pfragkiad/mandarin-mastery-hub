import { describe, expect, it } from 'vitest';
import { glyphCardInk } from './card-ink';

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
