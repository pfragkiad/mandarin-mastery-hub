import { readCatalog } from '@/test/catalog-fixture';
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { catalog, groupReadingMeanings, hydrateCatalog, readingMeaning, readingMeanings, type CatalogData } from './catalog-store';
import { cardReadingSplit } from './glyph-presentation';
import { characterMeaning } from './vocabulary-meaning';

const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
let data: CatalogData;
beforeAll(() => {
  data = readCatalog();
  hydrateCatalog(data, read('radical-identities.json'), read('radical-strokes.json'));
});

describe('meaning for each reading', () => {
  it('地 pairs the adverbial particle with de and land senses with dì across detail and card displays', () => {
    const row = catalog.characters.find(item => item[0] === '地')!;
    const split = [
      { reading: 'de', meaning: 'structural particle marking an adverbial' },
      { reading: 'dì', meaning: 'ground; land; earth; soil; region' },
    ];
    expect(readingMeanings('地')).toEqual(split);
    expect(cardReadingSplit(row[0], row[1], row[2])).toEqual(split);
    expect(characterMeaning(row[0], row[1], row[2])).toBe(split.map(item => `${item.reading}: ${item.meaning}`).join(' / '));
    expect(row[2]).toBe('earth; soil, ground; region');
  });

  it('了 liǎo means to finish / to understand, not the particle', () => {
    expect(readingMeaning('了', 'liǎo')).toBe('to finish; to understand (as in 了解)');
  });

  it('了 le is the particle of completed action', () => {
    expect(readingMeaning('了', 'le')).toBe('particle of completed action');
  });

  it('details list the readings in their recorded order', () => {
    expect(readingMeanings('了')?.map(item => item.reading)).toEqual(['le', 'liǎo']);
  });

  it('an unresolved exact-reading discrepancy keeps its combined meaning (no split)', () => {
    expect(readingMeanings('剖')).toBeNull();
    expect(readingMeaning('剖', 'pǒ')).toBeUndefined();
  });

  it('separates common polyphones and preserves historical names and units under their attested reading', () => {
    expect(readingMeaning('都', 'dōu')).toBe('all; both; entirely; even; already');
    expect(readingMeaning('都', 'dū')).toContain('capital city');
    expect(readingMeaning('炔', 'quē')).toContain('alkyne');
    expect(readingMeaning('炔', 'guì')).toBe('surname Gui');
    expect(readingMeaning('麃', 'páo')).toBe('a kind of deer (archaic)');
    expect(readingMeaning('麃', 'biāo')).toBe('to weed; to till');
    expect(readingMeaning('斗', 'dǒu')).toContain('8th lunar mansion');
    expect(readingMeaning('斗', 'dòu')).not.toContain('lunar');
  });

  it('shares regional meanings instead of manufacturing a semantic distinction', () => {
    expect(groupReadingMeanings(readingMeanings('誰')!)).toMatchObject([
      { readings: ['shuí', 'shéi'], meaning: 'who? whom? whose? anyone?' },
    ]);
    expect(readingMeaning('識', 'shí')).toBe(readingMeaning('識', 'shì'));
    expect(readingMeaning('眄', 'miàn')).toBe(readingMeaning('眄', 'miǎn'));
  });

  it('does not borrow dialectal or unrecorded-reading senses from a combined definition', () => {
    expect(readingMeanings('砉')?.every(item => !item.meaning.includes('flaying'))).toBe(true);
    expect(readingMeanings('差')?.every(item => !item.meaning.includes('officer'))).toBe(true);
    expect(readingMeaning('著', 'zhe')).toContain('aspect particle');
    expect(readingMeaning('著', 'zhe')).not.toContain('wear');
    expect(readingMeaning('伲', 'ní')).toBeUndefined();
    expect(readingMeanings('崾')).toBeNull();
  });

  it('瞭 liǎo means to understand (as in 瞭解), its first listed sense', () => {
    expect(readingMeaning('瞭', 'liǎo')).toBe('to understand (as in 瞭解); bright, clear');
  });

  it('瞭 liào means to look from afar (as in 瞭望)', () => {
    expect(readingMeaning('瞭', 'liào')).toBe('to look from afar (as in 瞭望); clear-sighted');
  });

  it('瞭 details list liào then liǎo, as recorded', () => {
    expect(readingMeanings('瞭')?.map(item => item.reading)).toEqual(['liào', 'liǎo']);
  });

  it('a later change to the recorded meaning drops the stale split', () => {
    const row = catalog.characters.find(item => item[0] === '了')!;
    const original = row[2];
    row[2] = 'something corrected';
    try { expect(readingMeanings('了')).toBeNull(); } finally { row[2] = original; }
  });
});
