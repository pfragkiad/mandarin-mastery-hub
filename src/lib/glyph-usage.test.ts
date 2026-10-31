import { describe, expect, it } from 'vitest';
import { glyphUsage, glyphParentCharacters, glyphParentCharactersGSource } from './glyph-usage';
import type { LibraryEntry } from './character-library';
import type { CharacterEnrichment } from './character-enrichment';
import type { Word } from './mandarin';
import usage from '../../public/data/usage-order.json';
import { hydrateUsageOrder, type UsageOrderFile } from './usage-frequency';

const glyph = (hanzi: string, note = ''): LibraryEntry => ({ id: `Characters:${hanzi}`, hanzi, pinyin: '', meaning: '', note });
const word = (id: string, sentence: string): Word => ({ id, hanzi: id, sentence, pinyin: '', meaning: '', type: '', collection: '', level: '', translation: '' });
const gSourceRecord = (expression: string, directG = true): CharacterEnrichment =>
  ({ comparison: { alternatives: [{ expression, qualifiers: '', directG, virtualG: false }] } }) as CharacterEnrichment;
const loaderFor = (records: Record<string, CharacterEnrichment | null>) => async (character: string) => records[character] ?? null;

describe('Existing glyph usage', () => {
  it.each(['Components', 'Radicals'] as const)('selects the six most frequent parent examples before limiting %s', async kind => {
    hydrateUsageOrder(usage as UsageOrderFile);
    const parents = ['龘', '人', '一', '了', '是', '不', '的', '在'].map(hanzi => ({
      ...glyph(hanzi, 'recorded · 丷 radical'),
      decomposition: { root: { glyph: '丷', position: '' }, source: 'recorded', status: 'recorded' },
    }));
    const ordered = kind === 'Components'
      ? await glyphParentCharactersGSource(glyph('丷'), parents, false, loaderFor(Object.fromEntries(parents.map(parent => [parent.hanzi, gSourceRecord('⿱丷八')]))))
      : glyphParentCharacters(glyph('丷'), kind, parents);
    expect(ordered.slice(0, 6).map(row => row.hanzi)).toEqual(['的', '一', '是', '不', '了', '在']);
    expect(ordered.at(-1)?.hanzi).toBe('龘');
  });
  it('finds parent components through exact BabelStone G-source trees, never the Hanzi structure', async () => {
    const parent = { ...glyph('好'), decomposition: { root: { glyph: '⿰', position: '', children: [{ glyph: '女', position: '' }, { glyph: '孑', position: '' }] }, source: 'recorded', status: 'recorded' } };
    const load = loaderFor({ 好: gSourceRecord('⿰女子') });
    expect((await glyphParentCharactersGSource(glyph('子'), [parent, glyph('子'), glyph('字')], false, load)).map(row => row.id)).toEqual(['Characters:好']);
    expect(await glyphParentCharactersGSource(glyph('孑'), [parent], false, load)).toEqual([]);
  });
  it('ignores Hanzi-only membership and non-direct-G alternatives for component parents', async () => {
    const hanziOnly = { ...glyph('字'), decomposition: { root: { glyph: '子', position: '' }, source: 'recorded', status: 'recorded' } };
    const virtualOnly = glyph('好');
    const load = loaderFor({ 好: gSourceRecord('⿰女子', false) });
    expect(await glyphParentCharactersGSource(glyph('子'), [hanziOnly, virtualOnly], false, load)).toEqual([]);
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