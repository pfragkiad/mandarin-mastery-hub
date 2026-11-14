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
      expect(store.catalog[key]).toEqual(data[key]);
      expect(fetchFile.mock.calls.filter(([url]) => url === `/data/${key}.json`)).toHaveLength(1);
    }
    expect(store.catalog.strokes).toBe(rows.strokes);
    const strokeData = JSON.parse(readFileSync('public/data/strokes.json', 'utf8')) as StrokeFile;
    expect(store.catalog.strokes).toEqual(strokeData.strokes);
    expect(fetchFile.mock.calls.filter(([url]) => url === '/data/strokes.json')).toHaveLength(1);
    expect(store.catalog.trees).toEqual(data.trees);
    expect(store.catalog.readingAudio).toEqual(data.readingAudio);
    expect(store.readingMeaning('了', 'liǎo')).toBe('to finish; to understand (as in 了解)');
    expect(store.catalog.loaded).toBe(true);
    expect(store.catalog.version).toBe(1); // Runtime invalidation counter, independent of file schema version.
    const requests = fetchFile.mock.calls.length;
    await store.loadCatalog();
    expect(fetchFile).toHaveBeenCalledTimes(requests);
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
