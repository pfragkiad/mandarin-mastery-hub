import { describe, expect, it, vi } from 'vitest';
import type { LibraryEntry } from './character-library';
import { filterLibrary } from './character-library';
import { libraryFilterOptions } from './library-filter-options';

vi.mock('./usage-frequency', async importOriginal => ({
  ...await importOriginal<typeof import('./usage-frequency')>(),
  usageRank: (entry: LibraryEntry) => entry.hanzi === '?' ? null : Number(entry.hanzi),
}));

const entries: LibraryEntry[] = [
  { id: 'Components:a', hanzi: '301', strokes: 3, pinyin: '', meaning: '', note: '' },
  { id: 'Components:b', hanzi: '500', strokes: 7, pinyin: '', meaning: '', note: '' },
  { id: 'Components:c', hanzi: '501', strokes: 26, pinyin: '', meaning: '', note: '' },
  { id: 'Components:d', hanzi: '100', strokes: 3, pinyin: '', meaning: '', note: '' },
  { id: 'Components:e', hanzi: '?', strokes: 26, pinyin: '', meaning: '', note: '' },
];

describe('applied rank/stroke availability', () => {
  for (const kind of ['Characters', 'Components'] as const) {
    it(`${kind}: rank 301–500 excludes unavailable 26 strokes`, () => {
      expect(libraryFilterOptions(entries, kind, false, '301-500').strokes).toEqual([3, 7]);
    });
    it(`${kind}: 26 strokes keeps only represented rank groups, including unranked`, () => {
      expect(libraryFilterOptions(entries, kind, false, undefined, '26').ranks.map(group => group.value)).toEqual(['501-1000', 'unranked']);
    });
    it(`${kind}: each filter ignores itself even when the intersection is empty`, () => {
      const options = libraryFilterOptions(entries, kind, false, '301-500', '26');
      expect(options.strokes).toEqual([3, 7]);
      expect(options.ranks.map(group => group.value)).toEqual(['501-1000', 'unranked']);
    });
    it(`${kind}: clearing restores all recorded choices`, () => {
      expect(libraryFilterOptions(entries, kind, false).strokes).toEqual([3, 7, 26]);
    });
  }
  it('respects exact script visibility and omits missing stroke counts', () => {
    const forms: LibraryEntry[] = [
      { ...entries[0], id: 'Components:traditional', hanzi: '301', strokes: 9, pinyin: '', meaning: '', note: '', script: 'Traditional' },
      { id: 'Components:missing', hanzi: '500', pinyin: '', meaning: '', note: '' },
    ];
    expect(libraryFilterOptions(forms, 'Components', false).strokes).toEqual([]);
    expect(libraryFilterOptions(forms, 'Components', true).strokes).toEqual([9]);
  });
});

describe('cumulative "lower ranks" / "fewer strokes" widening', () => {
  it('rank group alone matches only the group; widened adds every more frequent rank', () => {
    expect(libraryFilterOptions(entries, 'Components', false, '101-200').strokes).toEqual([]);
    expect(libraryFilterOptions(entries, 'Components', false, '101-200', '', true).strokes).toEqual([3]);
  });
  it('widened ranks still exclude unranked records, which have no rank', () => {
    expect(libraryFilterOptions(entries, 'Components', false, '501-1000').strokes).toEqual([26]);
    expect(libraryFilterOptions(entries, 'Components', false, '501-1000', '', true).strokes).toEqual([3, 7, 26]);
  });
  it('stroke count alone matches exactly; widened adds every smaller count', () => {
    expect(libraryFilterOptions(entries, 'Components', false, undefined, '7').ranks.map(group => group.value)).toEqual(['301-500']);
    expect(libraryFilterOptions(entries, 'Components', false, undefined, '7', false, true).ranks.map(group => group.value)).toEqual(['51-100', '301-500']);
  });
  it('filterLibrary applies the same widening', () => {
    expect(filterLibrary(entries, '', '7', false, false).map(entry => entry.hanzi)).toEqual(['500']);
    expect(filterLibrary(entries, '', '7', false, false, undefined, undefined, false, false, false, true).map(entry => entry.hanzi).sort()).toEqual(['100', '301', '500']);
    expect(filterLibrary(entries, '', '', false, false, '101-200')).toEqual([]);
    expect(filterLibrary(entries, '', '', false, false, '101-200', undefined, false, false, true).map(entry => entry.hanzi)).toEqual(['100']);
  });
});