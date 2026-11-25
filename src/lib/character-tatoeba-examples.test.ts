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

  it('allows retry after an unavailable file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => data }));
    const { loadCharacterTatoebaExample: load } = await import('./character-tatoeba-examples');
    expect(await load(recordId)).toBeNull();
    expect(await load(recordId)).toEqual(example);
  });

  it('builds our own sentence pinyin from recorded readings and fails closed on gaps', async () => {
    const { ownSentencePinyin } = await import('./character-tatoeba-examples');
    const readings = new Map([
      ['我', 'wǒ'], ['爱', 'ài'], ['你', 'nǐ'], ['用', 'yòng'], ['荷', 'hé'], ['兰', 'lán'],
      ['语', 'yǔ'], ['怎', 'zěn'], ['么', 'me'], ['说', 'shuō / shuì'], ['地', 'de / dì'],
    ]);
    const readingFor = (glyph: string) => readings.get(glyph) ?? null;
    expect(ownSentencePinyin('我爱你。', readingFor)).toBe('Wǒ ài nǐ。');
    // Latin text and punctuation pass through as recorded; syllables space per character.
    expect(ownSentencePinyin('XXX用荷兰语怎么说？', readingFor)).toBe('XXX yòng hé lán yǔ zěn me shuō？');
    // Multi-reading characters take the dictionary-primary first reading; name readings are never guessed.
    expect(ownSentencePinyin('地说。我说。', readingFor)).toBe('De shuō。 Wǒ shuō。');
    // Any hanzi without a recorded reading fails closed to no pinyin line at all.
    expect(ownSentencePinyin('我説你。', readingFor)).toBeUndefined();
  });

  it('covers every real Tatoeba sentence with recorded readings, failing closed only on the known gaps', async () => {
    const { ownSentencePinyin } = await import('./character-tatoeba-examples');
    const { isHanziChar } = await import('./sentence-align');
    const readings = new Map<string, string>();
    for (const [file, key] of [['characters.json', 'characters'], ['components.json', 'components'], ['radicals.json', 'radicals']] as const)
      for (const row of JSON.parse(readFileSync(`public/data/${file}`, 'utf8'))[key] as string[][])
        if (row[0] && row[1] && !readings.has(row[0])) readings.set(row[0], row[1]);
    const readingFor = (glyph: string) => readings.get(glyph) ?? null;
    const missing = new Set<string>();
    let covered = 0;
    for (const ex of Object.values(data.examples)) {
      if (ownSentencePinyin(ex.sentence, readingFor)) covered++;
      for (const ch of Array.from(ex.sentence)) if (isHanziChar(ch) && !readings.has(ch)) missing.add(ch);
    }
    // The only unrecorded sentence glyphs are these traditional forms; their sentences show no pinyin line.
    expect([...missing].sort()).toEqual(['爲', '箇', '説', '鍍']);
    const uncovered = Object.values(data.examples).filter(ex => Array.from(ex.sentence).some(ch => isHanziChar(ch) && !readings.has(ch))).length;
    expect(covered).toBe(Object.keys(data.examples).length - uncovered);
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
