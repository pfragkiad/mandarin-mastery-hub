import { describe, expect, it } from 'vitest';
import { lessonGlyphHint } from './lesson-hints';

describe('lessonGlyphHint', () => {
  it('uses the exact Characters record before a radical card of the same form', () => {
    const hint = lessonGlyphHint('心', false)!;
    expect(hint.kind).toBe('Characters');
    expect(hint.search).toEqual({ tab: 'Characters', id: 'Characters:心' });
    expect(hint.radicalNumber).toBe(61);
  });
  it('reads one character only and never guesses an unknown glyph', () => {
    expect(lessonGlyphHint('次第', false)).toBeNull();
    expect(lessonGlyphHint('A', false)).toBeNull();
  });
  it('keeps the recorded reading and stroke count', () => {
    const hint = lessonGlyphHint('次', false)!;
    expect(hint.pinyin).toBe('cì');
    expect(hint.strokes).toBe(6);
  });
});
