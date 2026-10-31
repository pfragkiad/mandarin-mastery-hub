import { describe, expect, it } from 'vitest';
import { resolveBabelStoneComponent } from './babelstone-components';
import { parseIdsTree } from './ids-tree';

describe('BabelStone numbered component source identities', () => {
  it('resolves 48 to F5FC and keeps 㐄 as a substitution, not identity', async () => {
    expect(await resolveBabelStoneComponent('{48}')).toEqual({
      id: 48, description: 'bottom of 年 [J-form of 㐄]', codePoint: 0xF5FC,
      suggestedSubstitution: '㐄',
    });
    expect(parseIdsTree('⿱𠂉{48}')?.children?.[1]?.glyph).toBe('{48}');
  });
  it('resolves 100 to F3BE with no Unicode substitution', async () => {
    expect(await resolveBabelStoneComponent('{100}')).toEqual({
      id: 100, description: '之 without top stroke', codePoint: 0xF3BE,
      suggestedSubstitution: null,
    });
  });
  it('does not infer definitions for unknown numbers or Unicode lookalikes', async () => {
    expect(await resolveBabelStoneComponent('{999}')).toBeNull();
    expect(await resolveBabelStoneComponent('㐄')).toBeNull();
    expect(await resolveBabelStoneComponent('?')).toBeNull();
  });
});