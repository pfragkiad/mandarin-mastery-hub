import { describe, expect, it } from 'vitest';
import { cardMnemonic, codePointFromFileName, glyphCodePoint, mnemonicFor } from './mnemonics';

describe('memory pictures', () => {
  it('finds the 辶 picture by its exact code point file name (8fb6)', () => {
    expect(mnemonicFor('辶')?.url).toMatch(/\/8fb6\.webp$/);
    expect(mnemonicFor('辶')?.caption).toBe('Walk along a path');
  });
  it('never lends 辶’s picture to its heading 辵 or the look-alike ⻌', () => {
    expect(mnemonicFor('辵')).toBeNull();
    expect(mnemonicFor('⻌')).toBeNull();
  });
  it('gives a family card showing 辵 and 辶 the single 辶 picture', () => {
    expect(cardMnemonic(['辵', '辶'])?.glyph).toBe('辶');
    expect(cardMnemonic(['辵'])).toBeNull();
  });
  it('gives the whole #162 family (辵 first) the 辶 picture for its details', () => {
    expect(mnemonicFor('辵') ?? cardMnemonic(['辵', '辶'])).toMatchObject({ glyph: '辶' });
  });
  it('reads only lowercase-hex code point names', () => {
    expect(codePointFromFileName('8fb6.webp.asset.json')).toBe('8fb6');
    expect(codePointFromFileName('辶.png.asset.json')).toBeNull();
    expect(codePointFromFileName('README.md')).toBeNull();
    expect(glyphCodePoint('辶')).toBe('8fb6');
    expect(glyphCodePoint('辶辶')).toBeNull();
  });
});

describe('memory picture character band', () => {
  it('covers the top 46% by default and accepts only a recorded fraction up to 0.9', async () => {
    const { mnemonicBand } = await import('./mnemonics');
    expect(mnemonicFor('辶')?.band).toBe(0.46);
    expect(mnemonicBand({ band: 0.3 })).toBe(0.3);
    expect(mnemonicBand({ band: 0 })).toBe(0);
    expect(mnemonicBand({ band: 1.2 })).toBe(0.46);
    expect(mnemonicBand(undefined)).toBe(0.46);
  });
});
