import { describe, expect, it } from 'vitest';
import { formatStrokeRangeLabel, formatStrokeRangeValue, isValidStrokeFilter, matchesStrokeFilter, parseStrokeRange } from './stroke-range';

describe('stroke range helpers', () => {
  it('parses exact, range, open-ended and legacy cumulative filters', () => {
    expect(parseStrokeRange('')).toBeNull();
    expect(parseStrokeRange('4')).toEqual({ min: 4, max: 4 });
    expect(parseStrokeRange('4', true)).toEqual({ min: 1, max: 4 });
    expect(parseStrokeRange('4-9')).toEqual({ min: 4, max: 9 });
    expect(parseStrokeRange('11+')).toEqual({ min: 11, max: null });
    expect(parseStrokeRange('9-4')).toBeNull();
    expect(isValidStrokeFilter('1-5')).toBe(true);
    expect(isValidStrokeFilter('11+')).toBe(true);
    expect(isValidStrokeFilter('abc')).toBe(false);
  });

  it('formats slider values and labels consistently', () => {
    expect(formatStrokeRangeValue(1, null)).toBe('');
    expect(formatStrokeRangeValue(1, 5)).toBe('1-5');
    expect(formatStrokeRangeValue(6, 10)).toBe('6-10');
    expect(formatStrokeRangeValue(11, null)).toBe('11+');
    expect(formatStrokeRangeValue(4, 4)).toBe('4');
    expect(formatStrokeRangeLabel('')).toBe('1 – 20 strokes');
    expect(formatStrokeRangeLabel('', false, 3, 36)).toBe('3 – 36 strokes');
    expect(formatStrokeRangeLabel('', false, 7, 7)).toBe('7 strokes');
    expect(formatStrokeRangeLabel('4-9')).toBe('4 – 9 strokes');
    expect(formatStrokeRangeLabel('11+')).toBe('11+ strokes');
    expect(formatStrokeRangeLabel('1')).toBe('1 stroke');
  });

  it('matches recorded stroke counts and fails closed when unrecorded', () => {
    expect(matchesStrokeFilter(undefined, '')).toBe(true);
    expect(matchesStrokeFilter(undefined, '1-5')).toBe(false);
    expect(matchesStrokeFilter(3, '1-5')).toBe(true);
    expect(matchesStrokeFilter(6, '1-5')).toBe(false);
    expect(matchesStrokeFilter(11, '11+')).toBe(true);
    expect(matchesStrokeFilter(28, '11+')).toBe(true);
    expect(matchesStrokeFilter(10, '11+')).toBe(false);
  });
});