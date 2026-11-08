import { describe, expect, it } from 'vitest';
import { allSounds, checkTyped, hasRecording, matchesInitial, matchesSyllable, parsePinyin, soundAlikes, toneMark, type PinyinData } from './pinyin-guide';
import { filterByFocus, needsReview, parseProgress, pickNextSound, recordSound } from './pinyin-progress';

const rec = { url: '/x.mp3', ms: 900 };
const data: PinyinData = {
  syllables: [
    { base: 'zhi', initial: 'zh', final: 'i', tones: [1, 2, 3, 4, 5], note: null },
    { base: 'zi', initial: 'z', final: 'i', tones: [1, 3, 4, 5], note: null },
    { base: 'ji', initial: 'j', final: 'i', tones: [1, 2, 3, 4], note: null },
    { base: 'lü', initial: 'l', final: 'ü', tones: [2, 3, 4], note: null },
    { base: 'lu', initial: 'l', final: 'u', tones: [1, 2, 3, 4], note: null },
  ],
  recordings: { zhi1: rec, zhi2: rec, zhi3: rec, zhi4: rec, zi1: rec, zi3: rec, zi4: rec, ji1: rec, ji2: rec, ji3: rec, ji4: rec, 'lü3': rec, 'lü4': rec, lu3: rec, lu4: rec, zhi5: rec },
  inventorySource: { name: 'CC-CEDICT', url: '', license: '' },
  audioSource: { name: 'audio-cmn', url: '', license: '' },
};

describe('pinyin input', () => {
  it('accepts tone marks, numbers, v and u: for ü', () => {
    expect(parsePinyin('rén')).toEqual({ base: 'ren', tone: 2 });
    expect(parsePinyin('ren2')).toEqual({ base: 'ren', tone: 2 });
    expect(parsePinyin('lv4')).toEqual({ base: 'lü', tone: 4 });
    expect(parsePinyin('lu:4')).toEqual({ base: 'lü', tone: 4 });
    expect(parsePinyin('jü3')).toEqual({ base: 'ju', tone: 3 });
    expect(parsePinyin('má3')).toBeNull();
  });
  it('places tone marks on the right vowel', () => {
    expect(toneMark('lü', 3)).toBe('lǚ');
    expect(toneMark('liu', 2)).toBe('liú');
    expect(toneMark('hui', 4)).toBe('huì');
    expect(toneMark('zhou', 1)).toBe('zhōu');
  });
  it('searches by prefix, or by exact attested tone', () => {
    expect(matchesSyllable(data.syllables[0]!, 'zh')).toBe(true);
    expect(matchesSyllable(data.syllables[1]!, 'zi2')).toBe(false);
    expect(matchesInitial(data.syllables[2]!, 'group:3')).toBe(true);
  });
});

describe('recordings', () => {
  it('never plays the neutral tone, even if a file is listed', () => {
    expect(hasRecording(data, 'zhi', 5)).toBe(false);
    expect(allSounds(data).some(s => s.tone === 5)).toBe(false);
  });
  it('lists only real sound-alikes recorded in the same tone', () => {
    expect(soundAlikes(data, 'zhi', 1)).toEqual(['ji', 'zi']);
    expect(soundAlikes(data, 'zhi', 2)).toEqual(['ji']); // zi has no 2nd tone recording
    expect(soundAlikes(data, 'lü', 3)).toEqual(['lu']);
  });
});

describe('typed answers', () => {
  it('grades syllable and tone; a missing tone is a prompt, not a mistake', () => {
    expect(checkTyped('zhi1', 'zhi', 1).verdict).toBe('correct');
    expect(checkTyped('zhī', 'zhi', 1).verdict).toBe('correct');
    expect(checkTyped('zhi4', 'zhi', 1).verdict).toBe('wrong-tone');
    expect(checkTyped('zi1', 'zhi', 1).verdict).toBe('wrong');
    expect(checkTyped('zhi', 'zhi', 1).verdict).toBe('missing-tone');
    expect(checkTyped('42', 'zhi', 1).verdict).toBe('invalid');
  });
});

describe('progress', () => {
  it('marks a sound for review after a wrong answer and clears it after a right one', () => {
    let p = recordSound({}, 'zhi1', 'wrong');
    expect(needsReview(p['zhi1'])).toBe(true);
    p = recordSound(p, 'zhi1', 'right');
    expect(needsReview(p['zhi1'])).toBe(false);
    expect(p['zhi1']).toMatchObject({ right: 1, wrong: 1 });
  });
  it('drops malformed stored entries', () => {
    expect(parseProgress('{"zhi1":{"heard":1,"right":0,"wrong":0,"at":"x"},"zhi5":{"heard":1,"right":0,"wrong":0,"at":"x"},"bad":3}')).toEqual({ zhi1: { heard: 1, right: 0, wrong: 0, at: 'x' } });
  });
  it('filters by focus and skips the previous sound', () => {
    const sounds = allSounds(data);
    const p = recordSound(recordSound({}, 'ji1', 'wrong'), 'ji2', 'right');
    expect(filterByFocus(sounds, p, 'review').map(s => s.id)).toEqual(['ji1']);
    expect(filterByFocus(sounds, p, 'new').some(s => s.id === 'ji1' || s.id === 'ji2')).toBe(false);
    const two = sounds.filter(s => s.id === 'ji1' || s.id === 'ji2');
    expect(pickNextSound(two, p, 'ji1', () => 0)?.id).toBe('ji2');
  });
});

describe('shipped pinyin sidecars', () => {
  it('have a recording for every attested tone 1–4 (incl. shang, sha, shi, xi, zhen)', async () => {
    const inventory = (await import('@/data/pinyin/inventory.json')).default;
    const audio = (await import('@/data/pinyin/audio.json')).default;
    const data = { syllables: inventory.syllables as never, recordings: audio.recordings as never };
    expect(missingRecordings(data)).toEqual([]);
    expect(Object.keys(audio.recordings)).toHaveLength(1288);
    for (const id of ['shang1', 'shang3', 'shang4', 'sha1', 'shi4', 'xi1', 'zhen1']) expect(audio.recordings).toHaveProperty(id);
  });
  it('flags a half-imported recording list instead of silently showing no recordings', () => {
    const data = { syllables: [{ base: 'shang', initial: 'sh', final: 'ang', tones: [1, 3, 4, 5], note: null }] as never, recordings: {} };
    expect(missingRecordings(data)).toEqual(['shang1', 'shang3', 'shang4']);
  });
});
