import { describe, expect, it } from 'vitest';
import { glyphUsage, glyphParentCharacters } from './glyph-usage';
import type { LibraryEntry } from './character-library';
import type { Word } from './mandarin';

const glyph = (hanzi: string, note = ''): LibraryEntry => ({ id: `Characters:${hanzi}`, hanzi, pinyin: '', meaning: '', note });
const word = (id: string, sentence: string): Word => ({ id, hanzi: id, sentence, pinyin: '', meaning: '', type: '', collection: '', level: '', translation: '' });

describe('Existing glyph usage', () => {
  it('finds parent components through exact nested recorded trees without vocabulary', () => {
    const parent = { ...glyph('好'), decomposition: { root: { glyph: '⿰', position: '', children: [{ glyph: '女', position: '' }, { glyph: '子', position: '' }] }, source: 'recorded', status: 'recorded' } };
    expect(glyphParentCharacters(glyph('子'), 'Components', [parent, glyph('子'), glyph('字')]).map(row => row.id)).toEqual(['Characters:好']);
    expect(glyphParentCharacters(glyph('孑'), 'Components', [parent])).toEqual([]);
  });
  it('uses dictionary radical assignment rather than any graphical component', () => {
    const parent = { ...glyph('好', '6 strokes · 女 radical'), decomposition: { root: { glyph: '子', position: '' }, source: 'recorded', status: 'recorded' } };
    expect(glyphParentCharacters(glyph('女'), 'Radicals', [parent]).map(row => row.id)).toEqual(['Characters:好']);
    expect(glyphParentCharacters(glyph('子'), 'Radicals', [parent])).toEqual([]);
  });
  it('respects script preferences and preserves exact parent IDs without duplicates', () => {
    const parent = { ...glyph('媽', '13 strokes · 女 radical'), script: 'Traditional' as const };
    expect(glyphParentCharacters(glyph('女'), 'Radicals', [parent])).toEqual([]);
    expect(glyphParentCharacters(glyph('女'), 'Radicals', [parent, parent], true).map(row => row.id)).toEqual(['Characters:媽']);
  });
  it('limits existing glyph usage to a single example', () => {
    const rows = [word('a', '你一'), word('b', '你二'), word('c', '你三'), word('d', '你四')];
    expect(glyphUsage(glyph('你'), 'Characters', rows, []).map(row => row.word.id)).toEqual(['a']);
  });
  it('does not duplicate the same recorded sentence', () => {
    expect(glyphUsage(glyph('你'), 'Characters', [word('a', '你好'), word('b', '你好')], []).map(row => row.word.id)).toEqual(['a']);
  });
  it('matches components through recorded trees and radicals through dictionary assignments', () => {
    const parent = { ...glyph('好', '6 strokes · 女 radical'), decomposition: { root: { glyph: '⿰', position: '', children: [{ glyph: '女', position: '' }, { glyph: '子', position: '' }] }, source: 'recorded', status: 'recorded' } };
    const rows = [word('a', '你好')];
    expect(glyphUsage(glyph('子'), 'Components', rows, [parent])[0]?.matchedGlyph).toBe('好');
    expect(glyphUsage(glyph('女'), 'Radicals', rows, [parent])[0]?.matchedGlyph).toBe('好');
    expect(glyphUsage(glyph('子'), 'Radicals', rows, [parent])).toEqual([]);
  });
  it('never invents usage for individual strokes', () => {
    expect(glyphUsage(glyph('一'), 'Strokes', [word('一', '一')], [glyph('一')])).toEqual([]);
  });
});