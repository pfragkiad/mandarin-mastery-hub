import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterHskExample } from './character-hsk-examples';

const data = JSON.parse(readFileSync('public/data/character-hsk-examples.json', 'utf8')) as { version: number; examples: Record<string, CharacterHskExample> };

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Recorded HSK character sentence fallbacks', () => {
  it('retains exact source paragraphs, pinyin, translations, record IDs and checksums', () => {
    const ids = JSON.parse(readFileSync('public/data/catalog_ids.json', 'utf8')).characters;
    expect(Object.keys(data.examples)).toEqual(['Characters:刘', 'Characters:朗', 'Characters:英', 'Characters:陈']);
    for (const [id, example] of Object.entries(data.examples)) {
      expect(ids[example.character]).toBe(id);
      expect(example.sentence).toContain(example.character);
      const bytes = readFileSync(example.source.file);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(example.source.sha256);
      const lesson = JSON.parse(bytes.toString('utf8'));
      const original = example.source.jsonPointer.split('/').slice(1).reduce((value, key) => value[key], lesson);
      expect([example.sentence, example.pinyin, example.translation]).toEqual([original.hanzi, original.pinyin, original.english]);
      expect(example.source.lessonId).toBe(lesson.lesson_id);
      expect(example.source.status).toBe(lesson.metadata.status);
    }
  });

  it('fetches once on demand and never substitutes a traditional or non-character identity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Radicals:刘')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadCharacterHskExample('Characters:刘')).toEqual(data.examples['Characters:刘']);
    expect(await loadCharacterHskExample('Characters:劉')).toBeNull();
    expect(await loadCharacterHskExample('Characters:朗')).toEqual(data.examples['Characters:朗']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves gaps empty after a failed fetch and allows a later retry', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Characters:朗')).toBeNull();
    expect(await loadCharacterHskExample('Characters:朗')).toEqual(data.examples['Characters:朗']);
  });

  it('rejects a passage bound to the wrong character', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1, examples: { 'Characters:朗': data.examples['Characters:刘'] } }) }));
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Characters:朗')).toBeNull();
  });
});
