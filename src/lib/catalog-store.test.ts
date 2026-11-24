import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCatalog } from '@/test/catalog-fixture';
import type { StrokeFile } from './catalog-store';

let store: typeof import('./catalog-store');
beforeEach(async () => {
  // Exercise the browser's initial load rather than the test setup's hydrated singleton.
  vi.resetModules();
  store = await import('./catalog-store');
});
afterEach(() => vi.unstubAllGlobals());

describe('split catalogue loading', () => {
  it('joins the recorded sections and sidecars once while retaining shared row arrays', async () => {
    const rows = { characters: store.catalog.characters, radicals: store.catalog.radicals, components: store.catalog.components, strokes: store.catalog.strokes };
    const fetchFile = vi.fn(async (url: string) => ({ ok: true, json: async () => JSON.parse(readFileSync(`public${url}`, 'utf8')) }));
    vi.stubGlobal('fetch', fetchFile);
    const first = store.loadCatalog();
    expect(store.loadCatalog()).toBe(first);
    await first;

    const data = readCatalog();
    for (const key of ['characters', 'radicals', 'components'] as const) {
      expect(store.catalog[key]).toBe(rows[key]);
      const expected = key === 'characters' ? data.characters.map(row => row[0] === '伲' ? ['伲', 'nì / nǐ', ...row.slice(2)] : row) : data[key];
      expect(store.catalog[key]).toEqual(expected);
      expect(fetchFile.mock.calls.filter(([url]) => url === `/data/${key}.json`)).toHaveLength(1);
    }
    expect(store.catalog.strokes).toBe(rows.strokes);
    const strokeData = JSON.parse(readFileSync('public/data/strokes.json', 'utf8')) as StrokeFile;
    expect(store.catalog.strokes).toEqual(strokeData.strokes);
    expect(fetchFile.mock.calls.filter(([url]) => url === '/data/strokes.json')).toHaveLength(1);
    expect(store.catalog.trees).toEqual(data.trees);
    expect(store.catalog.readingAudio).toEqual({ ...data.readingAudio, '伲': { ...data.readingAudio['伲'], 'nì': 'cmn-syl-ni4' } });
    expect(store.readingMeaning('了', 'liǎo')).toBe('to finish; to understand (as in 了解)');
    expect(store.catalog.loaded).toBe(true);
    expect(store.catalog.version).toBe(1); // Runtime invalidation counter, independent of file schema version.
    const requests = fetchFile.mock.calls.length;
    await store.loadCatalog();
    expect(fetchFile).toHaveBeenCalledTimes(requests);
  });

  it('applies the sourced 伲 reading choice without mutating its imported tuple or retagging the original recording', () => {
    const data = readCatalog();
    const original = JSON.stringify(data);
    store.hydrateCatalog(data);
    expect(store.catalog.characters.find(row => row[0] === '伲')?.[1]).toBe('nì / nǐ');
    expect(store.readingMeaning('伲', 'nì')).toBe('I; we; my; our (dialectal)');
    expect(store.readingMeaning('伲', 'nǐ')).toBe('you (archaic variant of 你)');
    expect(store.catalog.readingAudio['伲']).toMatchObject({ 'ní': 'cmn-syl-ni2', 'nì': 'cmn-syl-ni4', 'nǐ': 'cmn-syl-ni3' });
    expect(JSON.stringify(data)).toBe(original);
  });

  it('drops both the pronunciation choice and added audio if the exact original tuple changes', () => {
    const data = readCatalog();
    data.characters.find(row => row[0] === '伲')![2] = 'updated source definition';
    store.hydrateCatalog(data);
    expect(store.catalog.characters.find(row => row[0] === '伲')?.[1]).toBe('ní / nǐ');
    expect(store.readingMeanings('伲')).toBeNull();
    expect(store.catalog.readingAudio['伲']?.['nì']).toBeUndefined();
  });

  it.each(['characters', 'radicals', 'components', 'strokes'] as const)('keeps an incomplete load unpublished and retries failed %s', async section => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === `/data/${section}.json` && fail) return { ok: false, status: 503 };
      return { ok: true, json: async () => JSON.parse(readFileSync(`public${url}`, 'utf8')) };
    }));
    await expect(store.loadCatalog()).rejects.toThrow(`${section} 503`);
    expect(store.catalog.loaded).toBe(false);
    expect(store.catalog.version).toBe(0);
    expect(store.catalog.characters).toEqual([]);
    expect(store.catalog.radicals).toEqual([]);
    expect(store.catalog.components).toEqual([]);
    expect(store.catalog.strokes).toEqual([]);

    fail = false;
    await store.loadCatalog();
    expect(store.catalog.loaded).toBe(true);
    expect(store.catalog[section].length).toBeGreaterThan(0);
  });
});
