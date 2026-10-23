import { describe, expect, it } from 'vitest';
import { catalog } from './catalog-store';
import { libraryEntries, filterLibrary } from './character-library';
import { radicalStrokes, radicalFamily, radicalForm } from './radical-strokes';
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
      const form = radical.kangxiIndex ? radicalFamily(radical.kangxiIndex)?.forms.find(form => form.character === radical.hanzi) : undefined;
      if (row?.status === 'recorded') expect(row.strokes.length).toBe(form?.strokeCount);
      if (row?.status === 'unrecorded' || row?.status === 'count-mismatch') expect(row?.strokes).toEqual([]);
    }
  });
  it('imports direct exact-form sources without borrowing missing historical outlines or names', async () => {
    expect(radicalStrokes('丨')?.strokes.map(stroke => stroke.name)).toEqual(['竖']);
    expect(radicalStrokes('氵')?.strokes.map(stroke => stroke.name)).toEqual(['点', '点', '提']);
    expect(radicalStrokes('𧢲')?.status).toBe('unrecorded');
    expect(await strokeNames('𧢲')).toBeNull();
  });
  it('records 宀 as 点, 点, 横钩 from the supplied direct source without claiming official verification', () => {
    const record = radicalStrokes('宀');
    expect(record?.status).toBe('recorded');
    expect(record?.strokes.map(s => s.name)).toEqual(['点', '点', '横钩']);
    expect(record?.strokes.map(s => s.pinyin)).toEqual(['diǎn', 'diǎn', 'héng gōu']);
    expect(record?.strokes.map(s => s.glyph)).toEqual(['㇔', '㇔', '㇖']);
    expect(record?.source).toBe('cjklib · C-locale strokeorder');
    expect(record?.officiallyVerified).toBe(false);
  });
  it('groups water variants under Kangxi family 85, preserving their exact glyphs', () => {
    expect(radicalFamily(85)?.forms.map(form => form.character)).toEqual(['水', '氵', '氺']);
    expect(catalog.radicalStrokes.families).toHaveLength(214);
  });
  it('finds water by its positional variant without adding variant cards to the canonical deck', () => {
    expect(filterLibrary(libraryEntries('Radicals'), '氵').map(entry => entry.id)).toContain('Radicals:水');
    expect(libraryEntries('Radicals').some(entry => entry.id === 'Radicals:氵')).toBe(false);
  });
  it('keeps the two grass sequences selectable rather than deduplicating the exact glyph', () => {
    const forms = radicalFamily(140)?.forms.filter(form => form.character === '艹');
    expect(forms?.map(form => form.strokeCount)).toEqual([3, 4]);
    expect(new Set(forms?.map(form => form.key)).size).toBe(2);
    expect(radicalStrokes('艹')?.status).toBe('ambiguous');
  });
  it('resolves variant keys only inside their own family', () => {
    const form = radicalFamily(85)?.forms.find(form => form.character === '氵');
    expect(form).toBeDefined();
    expect(radicalForm(85, form?.key)?.character).toBe('氵');
    expect(radicalForm(61, form?.key)).toBeUndefined();
  });
  it('never converts ambiguous or derived source sequences into definite Practice names', async () => {
    expect(radicalStrokes('心')?.status).toBe('ambiguous');
    expect(await strokeNames('心')).toBeNull();
    const derived = catalog.radicalStrokes.families?.flatMap(family => family.forms).find(form => form.record.status === 'derived');
    expect(derived).toBeDefined();
    if (derived) expect(await strokeNames(derived.character)).toBeNull();
  });
});