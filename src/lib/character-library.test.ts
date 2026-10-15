import { describe, expect, it } from 'vitest';
import { filterLibrary, libraryEntries, libraryPage, plannedCounts } from './character-library';
describe('Catalogue requirements', () => {
  it('plans for all 18 strokes', () => expect(plannedCounts.Strokes).toBe(18));
  it('plans for all 214 radicals', () => expect(plannedCounts.Radicals).toBe(214));
  it('plans for all 1843 components', () => expect(plannedCounts.Components).toBe(1843));
  it('plans for 9564 Official 2013 characters', () => expect(plannedCounts.Characters).toBe(9564));
  it('searches tone-free pinyin and translations', () => {
    expect(filterLibrary(libraryEntries('Characters'), 'wo').map(e => e.hanzi)).toEqual(['我']);
    expect(filterLibrary(libraryEntries('Components'), 'water').map(e => e.hanzi)).toEqual(['氵']);
  });
  it('keeps large catalogues bounded to one page', () => {
    const entries = Array.from({ length: 9564 }, (_, i) => ({ id: String(i), hanzi: String(i), pinyin: '', meaning: '', note: '' }));
    expect(libraryPage(entries, 2).entries[0]?.id).toBe('24');
    expect(libraryPage(entries, 2).entries).toHaveLength(24);
    expect(libraryPage(entries, 500).current).toBe(399);
  });
  it('does not invent decompositions for missing records', () => expect(libraryEntries('Characters').find(e => e.hanzi === '学')?.decomposition).toBeUndefined());
});