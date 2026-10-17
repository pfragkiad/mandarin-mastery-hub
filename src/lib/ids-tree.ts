import type { DecompositionNode } from './character-library';

const positions: Record<string, readonly string[]> = {
  '⿰': ['left', 'right'], '⿱': ['top', 'bottom'],
  '⿲': ['left', 'middle', 'right'], '⿳': ['top', 'middle', 'bottom'],
  '⿴': ['outer', 'inner'], '⿵': ['outer', 'inner'], '⿶': ['outer', 'inner'],
  '⿷': ['outer', 'inner'], '⿸': ['outer', 'inner'], '⿹': ['outer', 'inner'],
  '⿺': ['outer', 'inner'], '⿻': ['first', 'second'],
  '⿼': ['outer', 'inner'], '⿽': ['outer', 'inner'],
  '⿾': ['original'], '⿿': ['original'], '㇯': ['base', 'removed'],
};

/** Parse recorded prefix IDS only; unknown notation stays raw instead of guessed. */
export function parseIdsTree(expression: string): DecompositionNode | null {
  const tokens = Array.from(expression);
  let cursor = 0;
  function read(position: string): DecompositionNode | null {
    const glyph = tokens[cursor++];
    if (!glyph) return null;
    const childPositions = positions[glyph];
    if (childPositions) {
      const children: DecompositionNode[] = [];
      for (const childPosition of childPositions) {
        const child = read(childPosition);
        if (!child) return null;
        children.push(child);
      }
      return { glyph, position, children };
    }
    // BabelStone numbered components are opaque identifiers, not inferred glyphs.
    if (glyph === '{') {
      let identifier = '';
      while (cursor < tokens.length && tokens[cursor] !== '}') identifier += tokens[cursor++];
      if (tokens[cursor++] !== '}' || !/^\d+$/.test(identifier)) return null;
      return { glyph: `{${identifier}}`, position };
    }
    if (!/^[\p{Script=Han}\u2e80-\u2eff\u31c0-\u31ef？?]$/u.test(glyph)) return null;
    return { glyph, position };
  }
  const root = read('root');
  return cursor === tokens.length ? root : null;
}