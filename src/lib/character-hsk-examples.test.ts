import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterHskExample } from './character-hsk-examples';

const data = JSON.parse(readFileSync('public/data/character-hsk-examples.json', 'utf8')) as { version: number; examples: Record<string, CharacterHskExample> };
// The official-ID migration removed the old runtime sidecar. Keep this exact preserved
// passage as an isolated loader fixture; do not restore it without regenerated bindings.
const langExample: CharacterHskExample = {
  character: '朗',
  sentence: '星期六，两个孩子到公园玩。天气很晴朗，鸟儿在树上唱歌。',
  pinyin: 'Xīngqīliù, liǎng ge háizi dào gōngyuán wán. Tiānqì hěn qínglǎng, niǎor zài shù shang chàng gē.',
  translation: 'On Saturday, two children play in the park. The weather is clear, and birds sing in the trees.',
  source: {
    file: 'src/data/study_lessons/lessons/hsk3/level2/TOPIC_LESSON_ANIMALS_WEATHER/TOPIC_LESSON_ANIMALS_WEATHER.json',
    sha256: '86a4206318935b576c3da31400f1ff3f031761cc47cfa61afef6a4dd45c6dfc4',
    jsonPointer: '/sections/teaching_plan/reading/paragraphs/0',
    lessonId: 'topic-nature-and-the-weather', title: 'Nature and the Weather', collection: 'HSK Level 2', hskLevel: 2, status: 'draft',
  },
};
const fixture = { version: 1, examples: { 'Characters:朗': langExample } };

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Recorded HSK character sentence fallbacks', () => {
  it('does not retain pre-migration passages without regenerated official-ID bindings', () => {
    expect(data.version).toBe(1);
    expect(data.examples).toEqual({});
  });

  it('fetches once on demand and never substitutes another identity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Radicals:朗')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadCharacterHskExample('Characters:朗')).toEqual(langExample);
    expect(await loadCharacterHskExample('Characters:刘')).toBeNull();
    expect(await loadCharacterHskExample('Characters:朗')).toEqual(langExample);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves gaps empty after a failed fetch and allows a later retry', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => fixture });
    vi.stubGlobal('fetch', fetchMock);
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Characters:朗')).toBeNull();
    expect(await loadCharacterHskExample('Characters:朗')).toEqual(langExample);
  });

  it('rejects a passage bound to the wrong character', async () => {
    const wrong = { version: 1, examples: { 'Characters:朗': { ...langExample, character: '刘' } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => wrong }));
    const { loadCharacterHskExample } = await import('./character-hsk-examples');
    expect(await loadCharacterHskExample('Characters:朗')).toBeNull();
  });
});
