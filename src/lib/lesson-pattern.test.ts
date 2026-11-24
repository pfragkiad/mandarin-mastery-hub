import { describe, expect, it } from 'vitest';
import { pseudoTranslationParts, toPatternHeading } from './lesson-pattern';

const join = (v: string) => pseudoTranslationParts(v).map(p => p.text).join('');

describe('pseudoTranslationParts', () => {
  it('keeps angle-bracket slots visible and Mandarin alternatives as one bold part', () => {
    expect(pseudoTranslationParts('<subject> + 会/能 + <verb>')).toEqual([
      { kind: 'slot', text: '<subject>' }, { kind: 'text', text: ' + ' },
      { kind: 'mandarin', text: '会/能' }, { kind: 'text', text: ' + ' }, { kind: 'slot', text: '<verb>' },
    ]);
  });
  it('attaches a trailing full-width question mark to the Mandarin it ends', () => {
    expect(pseudoTranslationParts('<place you’re looking for> + 在 + 哪儿？').at(-1)).toEqual({ kind: 'mandarin', text: '哪儿？' });
  });
  it('treats a fixed phrase with no slots as Mandarin only', () => {
    expect(pseudoTranslationParts('上一次')).toEqual([{ kind: 'mandarin', text: '上一次' }]);
  });
  it('reconstructs every recorded string exactly, multiple slots included', () => {
    for (const v of ['每一次 + <action>, <subject> + 都 + <comment>', '以 <person or thing> 为 <role or standard>', '<verb> + 一次']) expect(join(v)).toBe(v);
  });
});

describe('toPatternHeading', () => {
  it('uses the three recorded fields for a modern card', () => {
    expect(toPatternHeading({ pattern_hanzi: '主语 + 会/能 + 动词', pattern_pinyin: 'zhǔyǔ + huì/néng + dòngcí', pattern_pseudo_translation: '<subject> + 会/能 + <verb>' }))
      .toEqual({ kind: 'modern', hanzi: '主语 + 会/能 + 动词', pinyin: 'zhǔyǔ + huì/néng + dòngcí', pseudoTranslation: '<subject> + 会/能 + <verb>' });
  });
  it('falls back to a legacy HSK formula_en', () => {
    expect(toPatternHeading({ formula_en: 'Subject + 会 + verb', pattern_hanzi: '' })).toEqual({ kind: 'legacy', formula: 'Subject + 会 + verb' });
  });
  it('keeps a legacy conversational card with no third line as modern with an empty gloss', () => {
    expect(toPatternHeading({ pattern_hanzi: '动词 + 一次', pattern_pinyin: 'dòngcí + yí cì' })).toMatchObject({ kind: 'modern', pseudoTranslation: '' });
  });
});
