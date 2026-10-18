import { describe, expect, it } from 'vitest';
import { strokeDirectionPoints } from './stroke-directions';

describe('recorded stroke directions', () => {
  it('preserves left-to-right direction in the writing square', () => {
    expect(strokeDirectionPoints([[100, 700], [800, 700]])).toEqual([[47, 72], [222, 72]]);
  });
  it('preserves downward movement and compound turns without guessing a straight line', () => {
    expect(strokeDirectionPoints([[100, 800], [800, 800], [800, 100], [700, 200]])).toEqual([[47, 47], [222, 47], [222, 222], [197, 197]]);
  });
  it('does not invent directions for missing or invalid medians', () => {
    expect(strokeDirectionPoints([])).toEqual([]);
    expect(strokeDirectionPoints([[1, 2]])).toEqual([]);
    expect(strokeDirectionPoints([[1, 2], [NaN, 3]])).toEqual([]);
    expect(strokeDirectionPoints([[1, 2], [1, 2]])).toHaveLength(1);
  });
});