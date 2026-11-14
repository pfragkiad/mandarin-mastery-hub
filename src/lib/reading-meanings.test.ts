import { readCatalog } from '@/test/catalog-fixture';
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { catalog, hydrateCatalog, readingMeaning, readingMeanings, type CatalogData } from './catalog-store';

const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
let data: CatalogData;
beforeAll(() => {
  data = readCatalog();
  hydrateCatalog(data, read('radical-identities.json'), read('radical-strokes.json'));
});

describe('meaning for each reading', () => {
  it('了 liǎo means to finish / to understand, not the particle', () => {
    expect(readingMeaning('了', 'liǎo')).toBe('to finish; to understand (as in 了解)');
  });

  it('了 le is the particle of completed action', () => {
    expect(readingMeaning('了', 'le')).toBe('particle of completed action');
  });

  it('details list the readings in their recorded order', () => {
    expect(readingMeanings('了')?.map(item => item.reading)).toEqual(['le', 'liǎo']);
  });

  it('a character without a reviewed split keeps its combined meaning (no split)', () => {
    expect(readingMeanings('万')).toBeNull();
    expect(readingMeaning('瞭', 'liǎo')).toBeUndefined();
  });

  it('a later change to the recorded meaning drops the stale split', () => {
    const row = catalog.characters.find(item => item[0] === '了')!;
    const original = row[2];
    row[2] = 'something corrected';
    try { expect(readingMeanings('了')).toBeNull(); } finally { row[2] = original; }
  });
});
