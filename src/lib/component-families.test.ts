import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { hydrateCharacterVariants, type CharacterVariantFile } from './character-variants';
import { componentCardGlyphs, componentCardHead, componentFamilyGroup, sharesFamilyReading } from './component-families';

beforeAll(() => hydrateCharacterVariants(JSON.parse(readFileSync('public/data/character-variants.json', 'utf8')) as CharacterVariantFile));

describe('Components radical-family cards', () => {
  it('puts 刀, 刂 and ⺈ (Radical #18, all dāo) on one card headed by 刀', () => {
    expect(componentCardGlyphs('刂', false)).toEqual(['刀', '刂', '⺈']);
    expect(componentCardHead('⺈', false)).toBe('刀');
  });
  it('keeps look-alikes with their own sound on their own cards', () => {
    for (const glyph of ['王', '巳', '母', '民', '西', '虎', '羋', '乚', '乛']) expect(componentFamilyGroup(glyph), glyph).toBeUndefined();
  });
  it('never groups the shared form 阝 or ⺀, whose identity names another radical', () => {
    expect(componentFamilyGroup('阝')).toBeUndefined();
    expect(componentFamilyGroup('⺀')).toBeUndefined();
  });
  it('treats a toneless recorded reading as the same sound, a different syllable as different', () => {
    expect(sharesFamilyReading('shui', ['shuǐ'])).toBe(true);
    expect(sharesFamilyReading('sī', ['mì'])).toBe(false);
    expect(sharesFamilyReading('', ['dāo'])).toBe(true);
  });
  it('adds Traditional forms to the family card only when Traditional is included', () => {
    expect(componentCardGlyphs('钅', true)).toEqual(['金', '钅', '釒']);
    expect(componentCardGlyphs('钅', false)).toEqual(['金', '钅']);
  });
});
