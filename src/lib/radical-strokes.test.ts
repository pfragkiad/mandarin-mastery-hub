import { describe, expect, it } from 'vitest';
import { catalog } from './catalog-store';
import { libraryEntries } from './character-library';
import { radicalStrokes } from './radical-strokes';
import { strokeNames } from './stroke-names';

describe('Radical-only stroke decompositions', () => {
  it('stores ordered cnchar-order names for 水 and 口', async () => {
    expect(radicalStrokes('水')?.strokes.map(s => s.name)).toEqual(['竖钩', '横撇', '撇', '捺']);
    expect(radicalStrokes('口')?.strokes.map(s => s.name)).toEqual(['竖', '横折', '横']);
    expect(radicalStrokes('水')?.strokes.map(({ name, pinyin }) => ({ name, pinyin }))).toEqual(await strokeNames('水'));
    expect(radicalStrokes('口')?.strokes.map(s => s.glyph)).toEqual(['㇑', '㇕', '㇐']);
  });
  it('never attaches IDS component trees to radical records', () => {
    const radicals = libraryEntries('Radicals');
    expect(radicals).toHaveLength(214);
    expect(radicals.filter(r => r.decomposition)).toEqual([]);
    expect(Object.keys(catalog.radicalStrokes.records)).toHaveLength(214);
    for (const radical of radicals) {
      const row = radicalStrokes(radical.hanzi);
      expect(row).toBeDefined();
      if (row?.status === 'recorded') expect(row.strokes.length).toBe(radical.strokes);
      else expect(row?.strokes).toEqual([]);
    }
  });
  it('leaves exact-source gaps unrecorded instead of guessing or borrowing a variant', () => {
    expect(radicalStrokes('丨')).toEqual({ status: 'unrecorded', strokes: [] });
    expect(radicalStrokes('氵')).toBeUndefined();
  });
});