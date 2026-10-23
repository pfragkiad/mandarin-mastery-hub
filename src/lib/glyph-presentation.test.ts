import { describe, expect, it } from 'vitest';
import { glyphPresentation } from './glyph-presentation';
import { libraryEntries } from './character-library';

describe('Exact component identities and lexical readings', () => {
  it('does not classify a missing character reading as a component', () => {
    expect(glyphPresentation('是', 'Characters', '').component).toBe(false);
    expect(glyphPresentation('了', 'Characters', 'le').characterPinyin).toBe('le');
  });
  it('identifies the pictured repeat symbol by U+2E80, not ice', () => {
    const info = glyphPresentation('⺀', 'Characters', '', 'ice');
    expect(info.codePoint).toBe('U+2E80');
    expect(info.component).toBe(true);
    expect(info.source).toContain('CJK RADICAL REPEAT');
    expect(libraryEntries('Characters').find(entry => entry.hanzi === '⺀')?.meaning).not.toContain('ice');
  });
  for (const glyph of ['⺈', '⺊', '⺌', '⺍', '⺗', '⺮']) {
    it(`recognizes exact positional form ${glyph} without borrowing a family reading`, () => {
      const info = glyphPresentation(glyph, 'Characters', 'borrowed');
      expect(info.component).toBe(true);
      expect(info.characterPinyin).toBe('');
    });
  }
  it('keeps bamboo component naming separate from zhú', () => {
    const info = glyphPresentation('⺮', 'Characters', 'zhú', 'bamboo; flute');
    expect(info.componentName?.pinyin).toBe('zhútóu');
    expect(info.speech).toBe('竹头');
    expect(info.characterPinyin).toBe('');
    expect(libraryEntries('Characters').find(entry => entry.hanzi === '⺮')?.pinyin).toBe('');
  });
  it('uses the supplied knife component name, not a standalone glyph pronunciation', () => {
    const info = glyphPresentation('⺈', 'Characters');
    expect(info.componentName?.pinyin).toBe('xiédāotóu');
    expect(info.speech).toBe('斜刀头');
  });
  it('does not speak an unnamed component or confuse it with the ice radical', () => {
    expect(glyphPresentation('⺀', 'Characters').speech).toBeNull();
    expect(glyphPresentation('冫', 'Radicals', 'bīng', 'ice').characterPinyin).toBe('bīng');
  });
});