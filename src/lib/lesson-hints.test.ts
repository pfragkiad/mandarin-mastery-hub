import { describe, expect, it } from 'vitest';
import { lessonGlyphHint, lessonGlyphHintById, lessonGlyphHints } from './lesson-hints';

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
  it('resolves a stroke symbol to its exact Strokes record, speaking its recorded Chinese name', () => {
    const hint = lessonGlyphHint('㇐', false)!;
    expect(hint.kind).toBe('Strokes');
    expect(hint.search).toEqual({ tab: 'Strokes', id: 'Strokes:㇐' });
    expect(hint.spoken).toBe('横');
    expect(hint.pinyin).toBe('héng');
  });
  it('keeps the lexical record as the head for a form that is also a stroke sample', () => {
    expect(lessonGlyphHint('一', false)!.kind).toBe('Characters');
  });
});

describe('lessonGlyphHintById', () => {
  it('resolves a recorded catalog_character_refs ID to its exact record', () => {
    const hint = lessonGlyphHintById('Characters:次', false)!;
    expect(hint.id).toBe('Characters:次');
    expect(hint.pinyin).toBe('cì');
    expect(hint.search).toEqual({ tab: 'Characters', id: 'Characters:次' });
  });
  it('fails closed on a mismatched glyph, unknown kind or missing record', () => {
    expect(lessonGlyphHintById('Characters:龘', false)).toBeNull();
    expect(lessonGlyphHintById('Words:次', false)).toBeNull();
    expect(lessonGlyphHintById('Characters', false)).toBeNull();
    expect(lessonGlyphHintById('Characters:次第', false)).toBeNull();
  });
});

// Owner rule: popup rows keep each record's identity colour; 八 is a radical, so every row is gold.
describe('lessonGlyphHints ink', () => {
  it('colours every 八 record (character, component, radical) radical gold', () => {
    const rows = lessonGlyphHints('八', false);
    expect(rows.map(row => row.kind)).toEqual(['Characters', 'Components', 'Radicals']);
    expect(rows.every(row => row.ink === 'card-ink-radical')).toBe(true);
  });
  it('colours an ordinary character green', () => {
    expect(lessonGlyphHint('我', false)!.ink).toBe('card-ink-character');
  });
});
