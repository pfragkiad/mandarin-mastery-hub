import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { audioCandidates, pickMandarinVoice, clampRate, SLOW_RATE, pronunciationAvailable } from './audio';
import { characterAudioRequest, characterRecording, hydrateCatalog, isNeutralReading } from './catalog-store';
const rec = { url: '/api/media/a.mp3', source: 'Shtooka', license: 'CC BY-SA 3.0 US', recordingKind: 'word' };
const char = { url: '/api/media/zhong1.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0', recordingKind: 'syllable', glyph: '中', reading: 'zhōng' };
describe('Audio fallback order', () => {
  it('prefers the attached recording, then TTS', () => { expect(audioCandidates({ text: '中国', audio: rec }).map(c => c.kind)).toEqual(['recording', 'tts']); });
  it('uses a character recording only for the exact reading', () => {
    expect(audioCandidates({ text: '中', reading: 'zhōng', characterAudio: [char] })[0]).toMatchObject({ tier: 'character-reading' });
    expect(audioCandidates({ text: '中', reading: 'zhòng', characterAudio: [char] }).map(c => c.kind)).toEqual(['tts']);
  });
  it('never builds a word from syllable recordings', () => { expect(audioCandidates({ text: '中国', reading: 'zhōng', characterAudio: [char] }).map(c => c.kind)).toEqual(['tts']); });
  it('labels TTS as Browser TTS', () => { expect(audioCandidates({ text: '水' })[0]?.label).toBe('Browser TTS'); });
});
describe('Mandarin voice selection', () => {
  it('rejects Cantonese voices', () => { expect(pickMandarinVoice([{ lang: 'zh-HK' }, { lang: 'yue-HK' }])).toBeUndefined(); });
  it('prefers zh-CN', () => { expect(pickMandarinVoice([{ lang: 'zh-TW' }, { lang: 'zh-CN' }])?.lang).toBe('zh-CN'); });
});
describe('Pronunciation availability', () => {
  it('disables a component without pinyin even when browser speech exists', () => {
    expect(pronunciationAvailable(false, null, true)).toBe(false);
  });
  it('disables unrecorded pronunciation until a Mandarin voice is confirmed', () => {
    expect(pronunciationAvailable(false, 'shuǐ', false)).toBe(false);
  });
  it('enables browser speech for a known reading and Mandarin voice', () => {
    expect(pronunciationAvailable(false, 'shuǐ', true)).toBe(true);
  });
  it('keeps attached recordings playable without browser speech or pinyin', () => {
    expect(pronunciationAvailable(true, null, false)).toBe(true);
  });
});
describe('Rates', () => {
  it('clamps to 0.5–1.2 and slow is 0.65', () => { expect([clampRate(0.1), clampRate(2)]).toEqual([0.5, 1.2]); expect(SLOW_RATE).toBe(0.65); });
});

describe('Character recording lookup', () => {
  hydrateCatalog({ version: 1, source: 'test', characters: [], radicals: [], components: [], trees: {}, readingAudio: { '中': { 'zhōng': 'zhong1' }, '讠': { 'yán': 'cmn-syl-yan2' }, '言': { 'yán': 'cmn-syl-yan2' }, '颜': { 'yán': 'cmn-syl-yan2' }, '门': { 'mén': 'cmn-syl-men2' } }, audio: { zhong1: { url: '/api/media/zhong1.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' }, 'cmn-syl-yan2': { url: '/reported-wrong-yan.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' }, 'cmn-syl-men2': { url: '/correct-men.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' } } });
  it('excludes the reported mén-sounding yán clip for all its glyph bindings', () => {
    for (const glyph of ['讠', '言', '颜']) {
      expect(characterRecording(glyph, 'yán')).toBeNull();
      expect(audioCandidates(characterAudioRequest(glyph, 'yán')).map(candidate => candidate.kind)).toEqual(['tts']);
    }
    expect(characterRecording('门', 'mén')?.url).toBe('/correct-men.mp3');
  });
  it('returns the exact-reading recording only when the reading is known', () => {
    expect(characterRecording('中', 'zhōng')?.url).toBe('/api/media/zhong1.mp3');
    expect(characterRecording('中', 'zhòng')).toBeNull();
    expect(characterRecording('中')).toBeNull();
    expect(characterRecording('水', 'shuǐ')).toBeNull();
  });
});

describe('Reviewed yán replacements', () => {
  it('replaces every quarantined binding with its selected Yue Tan word recording', () => {
    const catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
    const review = JSON.parse(readFileSync('importer/data/missing-audio/listening-review.json', 'utf8'));
    const clips = JSON.parse(readFileSync('importer/data/missing-audio/manifest.json', 'utf8')).clips;
    expect(review.characters).toHaveLength(25);
    for (const selected of review.characters) {
      const id = catalog.readingAudio[selected.glyph]?.[selected.reading];
      expect(id).not.toBe('cmn-syl-yan2');
      expect(catalog.audio[id]?.source).toBe('audio-cmn / Shtooka (cmn-caen-tan) / Yue Tan');
      expect(catalog.audio[id]?.url).toContain(`missing-${clips[selected.clipId].sha256.slice(0, 16)}`);
      expect(catalog.audio[id]?.recordingKind).toBe('word');
    }
  });
});

describe('Neutral-tone character readings', () => {
  it('never plays the catalogue binding for a neutral-tone reading', () => {
    hydrateCatalog({ version: 1, source: 'test', characters: [], radicals: [], components: [], trees: {}, readingAudio: { '吧': { 'ba': 'cmn-syl-ba5', 'bā': 'cmn-syl-ba1' } }, audio: { 'cmn-syl-ba5': { url: '/french.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' }, 'cmn-syl-ba1': { url: '/ba1.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' } } });
    expect(characterRecording('吧', 'ba')?.url).not.toBe('/french.mp3');
    expect(audioCandidates(characterAudioRequest('了', 'le')).map(c => c.kind)).toEqual(['recording', 'tts']);
    expect(characterRecording('吧', 'bā')?.url).toBe('/ba1.mp3');
    expect(isNeutralReading('ba')).toBe(true);
    expect(isNeutralReading('bā')).toBe(false);
  });
  it('plays the Sound chart neutral recording for any glyph read in exactly that toneless syllable', () => {
    hydrateCatalog({ version: 1, source: 'test', characters: [], radicals: [], components: [], trees: {}, readingAudio: { '吧': { 'ba': 'cmn-syl-ba5' }, '地': { 'dì': 'cmn-syl-di4' } }, audio: { 'cmn-syl-ba5': { url: '/french.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' }, 'cmn-syl-di4': { url: '/di4.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' } } });
    const ba = characterRecording('吧', 'ba');
    expect(ba?.url).toMatch(/cmn-5e672cf35336\.mp3$/);
    expect(ba?.license).toBe('CC BY-SA 3.0 US');
    expect(characterRecording('吗', 'ma')?.url).toMatch(/cmn-efb8320d2b52\.mp3$/);
    // 地 de, 嘛 ma and 著 zhe share the chart's neutral de / ma / zhe recordings.
    expect(characterRecording('地', 'de')?.url).toMatch(/cmn-6b192093367f\.mp3$/);
    expect(characterRecording('嘛', 'ma')?.url).toMatch(/cmn-efb8320d2b52\.mp3$/);
    expect(characterRecording('著', 'zhe')?.url).toMatch(/hsk2-d0c1708fa56e7cbf\.mp3$/);
    // The toned reading keeps its own syllable clip.
    expect(characterRecording('地', 'dì')?.url).toBe('/di4.mp3');
    // A toned reading never borrows the neutral recording.
    expect(characterRecording('吧', 'bā')).toBeNull();
    // Exact word recordings supply le / a / la / wa and the three newly reviewed neutral readings.
    expect(characterRecording('了', 'le')?.url).toMatch(/missing-e2dafa559bf7224a\.mp3$/);
    expect(characterRecording('啊', 'a')?.url).toMatch(/missing-863b8ff6668e7500\.mp3$/);
    expect(characterRecording('啦', 'la')?.url).toMatch(/hsk6-6ba151632e3cadb6\.mp3$/);
    expect(characterRecording('哇', 'wa')?.url).toMatch(/missing-8f80d73d89eea3e0\.mp3$/);
    expect(characterRecording('哇', 'wā')).toBeNull();
    expect(characterRecording('过', 'guo')?.url).toMatch(/missing-9c307f8facc8ed33\.wav$/);
    expect(characterRecording('头', 'tou')?.url).toMatch(/missing-/);
    expect(characterRecording('子', 'zi')?.url).toMatch(/missing-/);
    expect(characterRecording('呀', 'ya')).toBeNull();
  });
});
