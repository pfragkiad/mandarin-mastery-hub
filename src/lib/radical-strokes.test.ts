import { describe, expect, it } from 'vitest';
import { catalog } from './catalog-store';
import { libraryEntries, filterLibrary } from './character-library';
import { historicalRadicalHeading, orderedRadicalForms, practiceStrokeNames, radicalStrokes, radicalFamily, radicalForm } from './radical-strokes';
import { strokeNames } from './stroke-names';

describe('Radical-only stroke decompositions', () => {
  it('records the Traditional side forms 糹, 釒 and 飠 with their cjklib stroke orders', () => {
    const names = (id: number, ch: string) => radicalFamily(id)?.forms.find(form => form.character === ch)?.record.strokes.map(stroke => stroke.name);
    expect(names(120, '糹')).toEqual(['撇折', '撇折', '点', '点', '点', '点']);
    expect(names(167, '釒')).toEqual(['撇', '点', '横', '横', '竖', '点', '撇', '提']);
    // Glyph 0 (China/Japan); Taiwan's glyph 1 has 横 as stroke 3 and is not used.
    expect(names(184, '飠')).toEqual(['撇', '点', '点', '横折', '横', '横', '竖提', '点']);
  });
  it('prioritises Mainland 鱼 before historical 魚 without mutating the source forms', () => {
    const family = radicalFamily(195);
    expect(family).toBeDefined();
    if (!family) return;
    const keys = family.forms.map(form => form.key);
    expect(orderedRadicalForms(family).map(form => form.character).slice(0, 2)).toEqual(['鱼', '魚']);
    expect(family.forms.map(form => form.key)).toEqual(keys);
  });
  it('marks only distinct recorded historical headings, not Mainland or shared forms', () => {
    expect(historicalRadicalHeading('魚', 195)).toBe(true);
    expect(historicalRadicalHeading('鱼', 195)).toBe(false);
    expect(historicalRadicalHeading('木', 75)).toBe(false);
    expect(historicalRadicalHeading('魚', 75)).toBe(false);
  });
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
  it('keeps the two grass variants as separate exact glyphs (艹 three strokes, ⺿ four strokes)', () => {
    const forms = radicalFamily(140)?.forms.filter(form => form.formKind === 'variant');
    expect(forms?.map(form => [form.key, form.character, form.strokeCount])).toEqual([['140-1', '艹', 3], ['140-2', '⺿', 4]]);
    expect(radicalStrokes('艹')?.strokes.length).toBe(3);
    expect(radicalStrokes('⺿')?.strokes.length).toBe(4);
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
  it('lets Practice show derived names only flagged as derived, and only when counts match', () => {
    const 辵 = radicalStrokes('辵');
    expect(辵?.status).toBe('derived');
    if (!辵) return;
    const shown = practiceStrokeNames(辵, 7);
    expect(shown?.derived).toBe(true);
    expect(shown?.strokes.map(s => s.name)).toEqual(['撇', '撇', '撇', '竖', '横', '撇', '捺']);
    expect(practiceStrokeNames(辵, 6)).toBeNull();
    expect(practiceStrokeNames({ ...辵, status: 'unrecorded' }, 7)).toBeNull();
    expect(practiceStrokeNames({ ...辵, status: 'count-mismatch' }, 7)).toBeNull();
    expect(practiceStrokeNames({ ...辵, status: 'recorded' }, 7)?.derived).toBe(false);
  });
});