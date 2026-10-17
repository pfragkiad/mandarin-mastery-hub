import { describe, expect, it } from 'vitest';
import { parseIdsTree } from './ids-tree';

describe('BabelStone IDS trees', () => {
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