import { describe, expect, it } from 'vitest';
import { glyphPresentation, pureComponentForm } from './glyph-presentation';
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
    expect(libraryEntries('Components').find(entry => entry.hanzi === '⺀')?.meaning).not.toContain('ice');
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
    expect(libraryEntries('Components').find(entry => entry.hanzi === '⺮')?.pinyin).toBe('');
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
  it('presents a dual radical form as the ordinary character in the Characters tab', () => {
    const info = glyphPresentation('门', 'Characters', 'mén', 'gate, door, entrance, opening');
    expect(info.label).toBe('Character');
    expect(info.component).toBe(false);
    expect(info.characterPinyin).toBe('mén');
    expect(info.speech).toBe('门');
    expect(libraryEntries('Characters').find(entry => entry.hanzi === '门')?.pinyin).toBe('mén');
  });
  it('presents the same dual form as a component variant in the Components tab', () => {
    const info = glyphPresentation('门', 'Components', 'mén', 'gate, door, entrance, opening');
    expect(info.label).toBe('Component variant');
    expect(info.component).toBe(true);
    expect(info.characterPinyin).toBe('mén');
  });
  it('never repeats pure component forms in the Characters tab', () => {
    for (const glyph of ['⺀', '亻', '忄', '氵', '灬', '辶', '阝']) {
      expect(pureComponentForm(glyph)).toBe(true);
      expect(libraryEntries('Characters').find(entry => entry.hanzi === glyph)).toBeUndefined();
      expect(libraryEntries('Components').find(entry => entry.hanzi === glyph)).toBeDefined();
    }
    expect(pureComponentForm('门')).toBe(false);
    expect(pureComponentForm('是')).toBe(false);
  });
});
