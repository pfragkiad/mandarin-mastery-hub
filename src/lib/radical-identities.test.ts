import { describe, expect, it } from 'vitest';
import { radicalIdentity } from './radical-identities';
import { filterLibrary, glyphIndex, libraryDestination, libraryEntries } from './character-library';
import { searchAll } from './site-search';
import { catalog } from './catalog-store';

describe('Exact sourced Kangxi identities', () => {
  it('retains exactly 214 canonical identities and radical cards', () => {
    expect(Object.values(catalog.radicalIdentities.identities).filter(item => item.kind === 'canonical')).toHaveLength(214);
    expect(libraryEntries('Radicals')).toHaveLength(214);
  });
  for (const [glyph, number] of [['⼁', 2], ['丨', 2], ['丶', 3], ['⺮', 118], ['⺼', 130], ['月', 74], ['⻏', 163], ['⻖', 170]] as const) {
    it(`${glyph} resolves only to sourced Kangxi #${number}`, () => {
      expect(radicalIdentity(glyph).radicals.map(radical => radical.number)).toEqual([number]);
      expect(radicalIdentity(glyph).sourceIds.length).toBeGreaterThan(0);
    });
  }
  it('retains exact ordinary/symbol equivalences', () => {
    expect(radicalIdentity('⼁').equivalentGlyphs).toEqual(['丨']);
    expect(radicalIdentity('⺮').equivalentGlyphs).toEqual(['𥫗']);
  });
  for (const glyph of ['丆', '可', '〡', '㇑', '⿰', '{117}', '？']) {
    it(`never invents a radical identity for ${glyph}`, () => {
      expect(radicalIdentity(glyph).kind).toBe('unmapped');
      expect(radicalIdentity(glyph).radicals).toEqual([]);
    });
  }
  it('links a missing symbol card to its unique canonical radical', () => {
    expect(libraryDestination('⼁')).toEqual({ tab: 'Radicals', id: 'Radicals:丨' });
    expect(glyphIndex()['⼁']?.id).toBe('Radicals:丨');
    expect(libraryDestination('丆')).toBeUndefined();
  });
  it('preserves existing exact symbol records instead of substituting a radical', () => {
    // Pure component forms exist once, in the Components tab.
    expect(libraryDestination('⺮')?.id).toBe('Components:⺮');
    expect(libraryDestination('⺼')?.id).toBe('Components:⺼');
  });
  for (const [query, glyph] of [['⺮', '竹'], ['⺼', '肉'], ['⼁', '丨']] as const) {
    it(`finds ${glyph} through sourced symbol ${query} in radical and shared search`, () => {
      expect(filterLibrary(libraryEntries('Radicals'), query).map(entry => entry.hanzi)).toEqual([glyph]);
      expect(searchAll([], query).some(hit => hit.kind === 'Radical' && hit.hanzi === glyph)).toBe(true);
    });
  }
  it('pinyin-only searches do not use radical symbols', () => {
    expect(filterLibrary(libraryEntries('Radicals'), '⺮', '', false, false, undefined, undefined, true)).toEqual([]);
  });
});