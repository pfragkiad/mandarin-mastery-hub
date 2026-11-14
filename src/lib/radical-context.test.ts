import { readCatalog } from '@/test/catalog-fixture';
// Rules for look-alike radical forms inside a character: the character's declared radical
// decides; only 阝 has a positional fallback; standalone identities never change.
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { hydrateUsageOrder } from './usage-frequency';
import { libraryEntries, radicalVariantEntry } from './character-library';
import { radicalFamily } from './radical-strokes';
import { radicalIdentity } from './radical-identities';
import { contextualRadical } from './radical-context';
import { glyphParentCharacters } from './glyph-usage';

const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
beforeAll(() => {
  hydrateUsageOrder(read('usage-order.json'));
  hydrateCatalog(readCatalog(), read('radical-identities.json'), read('radical-strokes.json'));
});
const numbers = (glyph: string, position: string, owner?: string) => contextualRadical(glyph, position, owner).radicals.map(radical => radical.number);

describe('Contextual radical resolution', () => {
  it('reads right-side 阝 in 鄱 as 邑 #163 from its declared radical', () => {
    expect(contextualRadical('阝', 'right', '鄱')).toMatchObject({ radicals: [{ number: 163, glyph: '邑' }], form: { family: 163, glyph: '⻏' }, basis: 'declared' });
  });
  it('keeps left-side 阝 in 阳 as 阜 #170', () => {
    expect(numbers('阝', 'left', '阳')).toEqual([170]);
    expect(contextualRadical('阝', 'left', '阳').form).toBeUndefined();
  });
  it('falls back to position for 阝 when the declared radical is another family (祁 is 示)', () => {
    expect(contextualRadical('阝', 'right', '祁')).toMatchObject({ radicals: [{ number: 163 }], basis: 'position' });
  });
  it('keeps the standalone Unicode identity of 阝 as #170 without an owner', () => {
    expect(numbers('阝', 'right')).toEqual([170]);
    expect(radicalIdentity('阝').radicals.map(radical => radical.number)).toEqual([170]);
  });
  it('reads 月 in 胧 as 肉 #130 but keeps 月 in 朋 as #74', () => {
    expect(contextualRadical('月', 'left', '胧')).toMatchObject({ radicals: [{ number: 130 }], form: { family: 130, glyph: '⺼' } });
    expect(numbers('月', 'left', '朋')).toEqual([74]);
  });
  it('reads 日 in 曹 as 曰 #73 and 夂 in 夏 as 夊 #35', () => {
    expect(contextualRadical('日', 'bottom', '曹')).toMatchObject({ radicals: [{ number: 73 }], form: { glyph: '曰' } });
    expect(contextualRadical('夂', 'bottom', '夏')).toMatchObject({ radicals: [{ number: 35 }], form: { glyph: '夊' } });
  });
  it('has no position rule for 月: an undeclared context keeps #74', () => {
    expect(numbers('月', 'left', '期')).toEqual([74]);
  });
  it('records 釒 as Kangxi #167 from Unihan kRSUnicode 167.0', () => {
    expect(radicalIdentity('釒').radicals.map(radical => radical.number)).toEqual([167]);
  });
});

describe('Radical variant cards use contextual forms', () => {
  const characters = () => libraryEntries('Characters');
  const variant = (family: number, glyph: string) => {
    const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === family)!;
    const form = radicalFamily(family)!.forms.find(item => item.character === glyph)!;
    return { heading, entry: radicalVariantEntry(heading, form) };
  };
  it('lists right-side 阝 characters such as 鄱 and 郊 under 邑 ⻏', () => {
    const { heading, entry } = variant(163, '⻏');
    const parents = glyphParentCharacters(entry, 'Radicals', characters(), true, heading.hanzi).map(row => row.hanzi);
    expect(parents).toEqual(expect.arrayContaining(['鄱', '郊', '都']));
    expect(parents).not.toContain('阳');
  });
  it('keeps 阜 阝 characters such as 阳 and excludes 邑 characters', () => {
    const { heading, entry } = variant(170, '阝');
    const parents = glyphParentCharacters(entry, 'Radicals', characters(), true, heading.hanzi).map(row => row.hanzi);
    expect(parents).toContain('阳');
    expect(parents).not.toContain('鄱');
  });
  it('lists 胧 under 肉 ⺼', () => {
    const { heading, entry } = variant(130, '⺼');
    expect(glyphParentCharacters(entry, 'Radicals', characters(), true, heading.hanzi).map(row => row.hanzi)).toContain('胧');
  });
});

// A G-source breakdown that differs only by a look-alike codepoint for the same radical form
// is the same breakdown, so the duplicate "Hanzi graphical structure" is hidden.
describe('Breakdown agreement through contextual radical forms', () => {
  const tree = (character: string) => JSON.parse(fs.readFileSync('public/data/catalog.json', 'utf8')).trees[character];
  it('treats 胖 G-source ⿰月半 as the recorded ⿰⺼半 because 胖 declares 肉 #130', async () => {
    const { matchesRecordedGSource } = await import('./character-enrichment');
    const { parseIdsTree } = await import('./ids-tree');
    expect(matchesRecordedGSource(parseIdsTree('⿰月半') ?? undefined, tree('胖'), '胖')).toBe(true);
  });
  it('keeps them different without the owner character', async () => {
    const { matchesRecordedGSource } = await import('./character-enrichment');
    const { parseIdsTree } = await import('./ids-tree');
    expect(matchesRecordedGSource(parseIdsTree('⿰月半') ?? undefined, tree('胖'))).toBe(false);
  });
  it('keeps 月 and ⺼ different in a character declared under 月 #74 (朋)', async () => {
    const { sameContextualForm } = await import('./radical-context');
    expect(sameContextualForm('月', '⺼', 'left', '朋')).toBe(false);
  });
});
