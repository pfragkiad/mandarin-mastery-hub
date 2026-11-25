import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterTatoebaExample } from './character-tatoeba-examples';

const data = JSON.parse(readFileSync('public/data/character-tatoeba-examples.json', 'utf8')) as { version: number; examples: Record<string, CharacterTatoebaExample> };
const [recordId, example] = Object.entries(data.examples)[0]!;
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Exact Tatoeba sentence assignments', () => {
  it('loads bodies once on demand and never substitutes another record kind', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterTatoebaExample: load } = await import('./character-tatoeba-examples');
    expect(await load(recordId.replace('Characters:', 'Radicals:'))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await load(recordId)).toEqual(example);
    expect(await load(recordId)).toEqual(example);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/character-tatoeba-examples.json');
  });

  it('rejects mismatched targets, source links, review markers and stale pinyin', async () => {
    for (const changed of [
      { ...example, character: 'wrong' },
      { ...example, source: { ...example.source, chinese: { ...example.source.chinese, url: 'https://example.com' } } },
      { ...example, display: { marker: 'unknown', label: '' } },
      { ...example, sentence: example.sentence + ' changed', pinyin: 'old reading' },
    ]) {
      vi.resetModules();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, examples: { [recordId]: changed } }) }));
      const { loadCharacterTatoebaExample: load } = await import('./character-tatoeba-examples');
      expect(await load(recordId)).toBeNull();
    }
  });

  it('allows retry after an unavailable file and formats recorded pinyin through the existing helper', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => data }));
    const { loadCharacterTatoebaExample: load, tatoebaPinyin } = await import('./character-tatoeba-examples');
    expect(await load(recordId)).toBeNull();
    expect(await load(recordId)).toEqual(example);
    expect(tatoebaPinyin({ pinyin: 'Wo3men5 shi4shi5 kan4!' })).toBe('Wǒmen shìshi kàn!');
    expect(tatoebaPinyin({ pinyin: null })).toBeUndefined();
  });

  it('loads the small grid index independently of sentence bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, records: { [recordId]: 'warning_triangle' } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterSentenceAvailability: load } = await import('./character-tatoeba-examples');
    expect(await load(recordId)).toBe(true);
    expect(await load('Characters:unknown')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/character-sentence-index.json');
  });
});
