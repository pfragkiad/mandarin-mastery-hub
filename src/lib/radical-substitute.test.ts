import { describe, expect, it } from 'vitest';
import { isRadicalSubstitute, radicalSubstituteEntries } from './radical-substitute';
import { radicalFamily } from './radical-strokes';
import { radicalFormLabel } from './radical-form-label';

const key = (familyId: number, glyph: string) => radicalFamily(familyId)?.forms.find(form => form.character === glyph)?.key;
const substitute = (familyId: number, glyph: string) => isRadicalSubstitute(familyId, key(familyId, glyph));

describe('radical-family substitutes', () => {
  it('marks 西 in #146 襾 (own sound xī and meaning "west") as a substitute', () => expect(substitute(146, '西')).toBe(true));
  it('keeps 覀 a variant: its only meaning is the "variant of Kangxi radical 146" placeholder', () => expect(substitute(146, '覀')).toBe(false));
  it('keeps #96 王 a variant: the reviewed jade identity reads yù', () => expect(substitute(96, '王')).toBe(false));
  it('keeps forms sharing a sense with their family as variants (灬 fire, 纟 silk, 虎 tiger)', () => {
    expect(substitute(86, '灬')).toBe(false);
    expect(substitute(120, '纟')).toBe(false);
    expect(substitute(141, '虎')).toBe(false);
  });
  it('keeps forms presented as components of their family as variants (乚, 乛 under 乙)', () => {
    expect(substitute(5, '乚')).toBe(false);
    expect(substitute(5, '乛')).toBe(false);
  });
  it('keeps same-sound variants as variants (氵, 刂)', () => {
    expect(substitute(85, '氵')).toBe(false);
    expect(substitute(18, '刂')).toBe(false);
  });
  it('gives each substitute its own family-qualified card', () => {
    const cards = radicalSubstituteEntries();
    expect(cards.map(card => card.hanzi).sort()).toEqual(['孑', '巳', '旡', '母', '民', '羋', '西'].sort());
    const west = cards.find(card => card.hanzi === '西');
    expect(west?.id).toBe('Radicals:襾:variant:146-2');
    expect(west?.pinyin).toBe('xī');
    expect(west?.kangxiIndex).toBe(146);
  });
  it('labels a substitute "Substitute" in the form switch, other forms unchanged', () => {
    const family = radicalFamily(146)!;
    const form = (glyph: string) => family.forms.find(item => item.character === glyph)!;
    expect(radicalFormLabel(form('西'), family, undefined, true)).toBe('Substitute');
    expect(radicalFormLabel(form('覀'), family, undefined, false)).toBe('Variant');
    expect(radicalFormLabel(form('襾'), family, undefined, true)).toBe('Standard');
  });
});
