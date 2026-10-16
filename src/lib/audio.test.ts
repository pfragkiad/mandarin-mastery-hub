import { describe, it, expect } from 'vitest';
import { audioCandidates, pickMandarinVoice, clampRate, SLOW_RATE, pronunciationAvailable } from './audio';
import { characterRecording, hydrateCatalog } from './catalog-store';
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
  hydrateCatalog({ version: 1, source: 'test', characters: [], radicals: [], components: [], strokes: [], trees: {}, readingAudio: { '中': { 'zhōng': 'zhong1' } }, audio: { zhong1: { url: '/api/media/zhong1.mp3', source: 'audio-cmn', license: 'CC BY-SA 3.0' } } });
  it('returns the exact-reading recording only when the reading is known', () => {
    expect(characterRecording('中', 'zhōng')?.url).toBe('/api/media/zhong1.mp3');
    expect(characterRecording('中', 'zhòng')).toBeNull();
    expect(characterRecording('中')).toBeNull();
    expect(characterRecording('水', 'shuǐ')).toBeNull();
  });
});
