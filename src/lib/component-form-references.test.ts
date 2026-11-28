import { describe, expect, it } from 'vitest';
import { catalog } from './catalog-store';
import { componentFormMeaning, componentFormReference } from './component-form-references';
import { cardMeaning, glyphPresentation } from './glyph-presentation';
import { libraryEntries, radicalVariantFallback } from './character-library';
import { characterMeaning } from './vocabulary-meaning';
import { lessonGlyphHint } from './lesson-hints';
import { searchAll } from './site-search';

describe('reviewed component and variant references', () => {
  for (const [glyph, target, reading] of [['歨', '步', 'bù'], ['毌', '貫', 'guàn'], ['丷', '八', 'bā']] as const) {
    it(`${glyph} leads with ${target}'s meaning and keeps its own attested reading`, () => {
      const raw = catalog.characters.find(row => row[0] === glyph)!;
      const linked = catalog.characters.find(row => row[0] === target)!;
      const ref = componentFormReference(glyph)!;
      expect(ref.meaningMode).toBe('shared');
      expect(ref.meaning).toBe(`${linked[2]}; (${raw[2]})`);
      expect(ref.target).toMatchObject({ id: `Characters:${target}`, reading });
      for (const kind of ['Characters', 'Components'] as const) {
        const entry = libraryEntries(kind).find(row => row.hanzi === glyph)!;
        expect(entry).toMatchObject({ id: `${kind}:${glyph}`, pinyin: reading, meaning: ref.meaning });
        const info = glyphPresentation(glyph, kind, entry.pinyin, entry.meaning);
        expect(info.meaning).toBe(ref.meaning);
        expect(info.speech).toBe(glyph);
        expect(info.reading).toBe(reading);
      }
      expect(characterMeaning(glyph, raw[1], raw[2])).toBe(ref.meaning);
      expect(cardMeaning(glyph, reading, ref.meaning)).toBe(ref.meaning);
      expect(lessonGlyphHint(glyph, true)?.meaning).toBe(ref.meaning);
      expect(radicalVariantFallback(glyph, reading)).toBeNull();
      expect(raw[2]).not.toBe(linked[2]); // on-disk source wording stays intact
    });
  }

  it('shows 龹 related context without assigning 卷 meaning or juǎn as its lexical identity', () => {
    const ref = componentFormReference('龹')!;
    expect(ref.meaningMode).toBe('related-only');
    expect(ref.meaning).toMatch(/^Related 卷: /);
    expect(ref.meaning).toContain('(Form of 卷 used as a phonetic component)');
    expect(ref.target.reading).toBe('juǎn');
    for (const kind of ['Characters', 'Components'] as const) {
      const entry = libraryEntries(kind).find(row => row.hanzi === '龹')!;
      expect(entry.pinyin).toBe('quǎn');
      expect(glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning)).toMatchObject({ reading: 'quǎn', speech: '龹', meaning: ref.meaning });
    }
    expect(componentFormMeaning('龹', 'juǎn', ref.description)).toBeNull();
  });

  it('invalidates references after either source or target tuple changes', () => {
    for (const glyph of ['歨', '步']) {
      const row = catalog.characters.find(item => item[0] === glyph)!;
      const original = row[2];
      try {
        row[2] = 'Updated source definition';
        expect(componentFormReference('歨')).toBeNull();
        expect(componentFormMeaning('歨', 'bù', 'Old variant of\u00a0步')).toBeNull();
      } finally { row[2] = original; }
    }
  });

  it('does not resolve arbitrary variant notes or overwrite unrelated caller text', () => {
    expect(componentFormReference('矽')).toBeNull();
    expect(componentFormReference('龶')).toBeNull();
    expect(componentFormMeaning('毌', 'guàn', 'independently corrected meaning')).toBeNull();
  });

  it('searches the displayed meaning while retaining the form’s own pronunciation', () => {
    expect(searchAll([], 'step', true, 10000, 'english').some(hit => hit.kind === 'Character' && hit.hanzi === '歨')).toBe(true);
    expect(searchAll([], 'juan3', true, 10000, 'exact').some(hit => hit.kind !== 'Word' && hit.hanzi === '龹')).toBe(false);
    expect(searchAll([], 'quan3', true, 10000, 'exact').some(hit => hit.kind === 'Character' && hit.hanzi === '龹')).toBe(true);
  });
});
