import { describe, expect, it } from 'vitest';
import { countComponentReuse, countRadicalUsage, reuseGroup } from './component-reuse';
import { filterLibrary, libraryEntries } from './character-library';

describe('Component reuse', () => {
  it.each([
    [100, 'very-frequent'], [487, 'very-frequent'],
    [20, 'frequent'], [99, 'frequent'],
    [5, 'moderate'], [19, 'moderate'],
    [1, 'less-frequent'], [4, 'less-frequent'], [0, 'unrecorded'],
  ])('classifies %i parent characters as %s', (count, group) => {
    expect(reuseGroup(count).value).toBe(group);
  });
  it('counts repeated components once per parent and includes both scripts', () => {
    const leaf = { glyph: '木', position: 'left' };
    const trees = {
      '林': { glyph: '⿰', position: 'root', children: [leaf, leaf] },
      '檯': { glyph: '⿰', position: 'root', children: [leaf] },
      '木': leaf,
      'not-a-character': { glyph: '木', position: 'root' },
    };
    expect(countComponentReuse(['木', '口'], ['林', '林', '檯', '木'], trees)).toEqual({ '木': 2, '口': 0 });
  });
  it('uses verified catalogue counts without treating repeated edges as extra parents', () => {
    const entries = libraryEntries('Components');
    expect(entries.find(e => e.hanzi === '口')?.reuseCount).toBe(487);
    expect(entries.find(e => e.hanzi === '氵')?.reuseCount).toBe(471);
    expect(entries.find(e => e.hanzi === '艹')?.reuseCount).toBe(435);
    expect(entries.find(e => e.hanzi === '木')?.reuseCount).toBe(400);
  });
  it('filters each approved group with complete catalogue coverage', () => {
    const entries = libraryEntries('Components');
    expect(filterLibrary(entries, '', '', false, true, 'very-frequent')).toHaveLength(30);
    expect(filterLibrary(entries, '', '', false, true, 'frequent')).toHaveLength(145);
    expect(filterLibrary(entries, '', '', false, true, 'moderate')).toHaveLength(633);
    expect(filterLibrary(entries, '', '', false, true, 'less-frequent')).toHaveLength(1003);
    expect(filterLibrary(entries, '', '', false, true, 'unrecorded')).toHaveLength(32);
  });
  it('keeps usage counts unchanged when traditional cards are hidden', () => {
    expect(filterLibrary(libraryEntries('Components'), '口', '', false, false, 'very-frequent').find(e => e.hanzi === '口')?.reuseCount).toBe(487);
    expect(libraryEntries('Characters').some(e => e.reuseCount !== undefined)).toBe(false);
  });
  it('counts assigned radicals rather than decomposition appearances', () => {
    expect(countRadicalUsage(['水', '木'], [
      ['河', '', '', '8 strokes · 水 radical', 'Common'],
      ['河', '', '', '8 strokes · 水 radical', 'Common'],
      ['漢', '', '', '14 strokes · 水 radical', 'Traditional'],
      ['⺀', '', '', 'Stroke count not recorded', 'Common'],
    ])).toEqual({ '水': 2, '木': 0 });
  });
  it('attaches the verified dictionary-radical counts', () => {
    const entries = libraryEntries('Radicals');
    expect(entries.find(e => e.hanzi === '水')?.reuseCount).toBe(484);
    expect(entries.find(e => e.hanzi === '艸')?.reuseCount).toBe(425);
    expect(entries.find(e => e.hanzi === '口')?.reuseCount).toBe(425);
    expect(entries.reduce((sum, e) => sum + (e.reuseCount ?? 0), 0)).toBe(9566);
  });
  it('shares all five filter categories with radicals', () => {
    const entries = libraryEntries('Radicals');
    expect(filterLibrary(entries, '', '', false, true, 'very-frequent')).toHaveLength(31);
    expect(filterLibrary(entries, '', '', false, true, 'frequent')).toHaveLength(54);
    expect(filterLibrary(entries, '', '', false, true, 'moderate')).toHaveLength(90);
    expect(filterLibrary(entries, '', '', false, true, 'less-frequent')).toHaveLength(39);
    expect(filterLibrary(entries, '', '', false, true, 'unrecorded')).toHaveLength(0);
  });
});