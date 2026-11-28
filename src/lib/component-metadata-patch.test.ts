import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog } from './catalog-store';
import { glyphIndex, libraryEntries, radicalVariantFallback } from './character-library';
import { glyphPresentation } from './glyph-presentation';
import { radicalIdentity } from './radical-identities';
import { radicalForms, radicalStrokes } from './radical-strokes';

const review = JSON.parse(readFileSync('importer/data/components/radical-family-metadata-review.json', 'utf8')) as {
  mappings: { glyph: string; symbol: string; family: number }[];
};

describe('source-backed component metadata patch', () => {
  for (const { glyph, symbol, family } of review.mappings) {
    it(`${glyph} presents family #${family} while keeping its own record and no lexical reading`, () => {
      const identity = radicalIdentity(glyph);
      expect(identity.kind).toBe('variant');
      expect(identity.radicals.map(item => item.number)).toEqual([family]);
      expect(identity.equivalentGlyphs).toContain(symbol);
      expect(identity.sourceIds.some(id => catalog.radicalIdentities.sources[id]?.source_url.endsWith('/EquivalentUnifiedIdeograph.txt'))).toBe(true);
      const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === family)!;
      const entry = libraryEntries('Components').find(entry => entry.hanzi === glyph)!;
      expect(entry).toMatchObject({ id: `Components:${glyph}`, pinyin: '' });
      expect(glyphIndex()[glyph]?.id).toBe(`Components:${glyph}`);
      expect(entry.meaning).toContain(`component form of ${heading.hanzi}`);
      expect(radicalVariantFallback(glyph, entry.pinyin)).toMatchObject({ headingGlyph: heading.hanzi, spoken: heading.hanzi, pinyin: heading.pinyin });
      expect(radicalVariantFallback(glyph, entry.pinyin, 1)).toBeNull();
      expect(catalog.components.find(row => row[0] === glyph)?.slice(1, 3)).toEqual(['', '']);
    });
  }

  it('adds metadata without inventing family form keys or stroke records', () => {
    for (const glyph of ['𡯂', '𦍋', '𨸏', '𩠐']) {
      expect(radicalForms(glyph)).toEqual([]);
      expect(radicalStrokes(glyph)).toBeUndefined();
    }
    expect(radicalForms('𧢲').map(item => item.form.key)).toEqual(['148-1']);
    expect(radicalStrokes('𧢲')?.status).toBe('unrecorded');
    expect(libraryEntries('Radicals')).toHaveLength(214);
  });

  it('describes 龶 once as a component without borrowing 青 identity, sound or meaning', () => {
    const info = glyphPresentation('龶', 'Components');
    expect(info).toMatchObject({ label: 'Component', meaning: 'Top component of 青 (青字头)', characterPinyin: '', reading: '', speech: null });
    expect(info.source).toContain('descriptive label only');
    expect(info.source).not.toContain('Unicode NamesList');
    expect(libraryEntries('Characters').some(entry => entry.hanzi === '龶')).toBe(false);
    expect(libraryEntries('Components').filter(entry => entry.hanzi === '龶')).toHaveLength(1);
    expect(glyphIndex()['龶']?.id).toBe('Components:龶');
    expect(radicalIdentity('龶').radicals).toEqual([]);
    expect(radicalVariantFallback('龶')).toBeNull();
    expect(catalog.componentRadicals['龶']).toBe('土');
    expect(catalog.characters.find(row => row[0] === '龶')?.slice(1, 3)).toEqual(['', '']);
  });

  it('keeps existing lexical readings and does not promote arbitrary cross-references', () => {
    expect(radicalVariantFallback('门', 'mén')).toBeNull();
    expect(libraryEntries('Characters').find(entry => entry.hanzi === '青')?.pinyin).toBe('qīng');
    expect(radicalIdentity('𭕄').kind).toBe('unmapped');
  });
});
