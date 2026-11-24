import { describe, expect, it } from 'vitest';
import { parseIdsTree, hasKnownDecomposition } from './ids-tree';

describe('BabelStone IDS trees', () => {
  it('hides unknown-only breakdowns such as 讠, including nested missing parts', () => {
    expect(hasKnownDecomposition(parseIdsTree('⿻？？'))).toBe(false);
    expect(hasKnownDecomposition(parseIdsTree('⿰⿱??？'))).toBe(false);
    expect(hasKnownDecomposition({ glyph: '讠', position: 'root', children: [{ glyph: '?', position: 'first' }, { glyph: '？', position: 'second' }] })).toBe(false);
  });
  it('keeps incomplete breakdowns with a known part or numbered source identity', () => {
    expect(hasKnownDecomposition(parseIdsTree('⿱一？'))).toBe(true);
    expect(hasKnownDecomposition(parseIdsTree('⿰?{24}'))).toBe(true);
    expect(hasKnownDecomposition({ glyph: '⿰', position: 'root', children: [{ glyph: '木', position: 'left', children: [{ glyph: '?', position: 'top' }] }, { glyph: '？', position: 'right' }] })).toBe(true);
    expect(hasKnownDecomposition({ glyph: '⿰', position: 'root', children: [{ glyph: '\uE000', position: 'left' }, { glyph: '？', position: 'right' }] })).toBe(true);
  });
  it('does not treat the whole glyph by itself as a decomposition', () => {
    expect(hasKnownDecomposition(parseIdsTree('讠'))).toBe(false);
  });
  it('parses 气 into the recorded three-part top–middle–bottom structure', () => {
    expect(parseIdsTree('⿳𠂉一⺄')).toEqual({ glyph: '⿳', position: 'root', children: [
      { glyph: '𠂉', position: 'top' }, { glyph: '一', position: 'middle' }, { glyph: '⺄', position: 'bottom' },
    ] });
  });
  it('preserves nested structure in 不', () => {
    expect(parseIdsTree('⿸丆⿰丨丶')).toEqual({ glyph: '⿸', position: 'root', children: [
      { glyph: '丆', position: 'outer' }, { glyph: '⿰', position: 'inner', children: [
        { glyph: '丨', position: 'left' }, { glyph: '丶', position: 'right' },
      ] },
    ] });
  });
  it('keeps numbered source components explicit instead of inventing glyphs', () => {
    expect(parseIdsTree('⿺廴{117}')?.children?.[1]).toEqual({ glyph: '{117}', position: 'inner' });
  });
  it('retains unknown leaves', () => {
    expect(parseIdsTree('⿱一？')?.children?.[1]?.glyph).toBe('？');
  });
  it.each(['⿰一', '⿰一木多', '〾⿰一木', '⿰一{abc}', '⿰一{12', ''])('rejects incomplete or unsupported notation: %s', expression => {
    expect(parseIdsTree(expression)).toBeNull();
  });
});