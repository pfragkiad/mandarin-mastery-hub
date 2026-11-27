import { describe, expect, it } from 'vitest';
import inventory from '@/data/pinyin/inventory.json';
import authored from '@/data/pinyin/tone-pairs.json';
import { words, type Word } from './mandarin';
import { enrichTonePairs, vocabularyToneExample } from './tone-pair-vocabulary';
import type { TonePairData } from './tone-pairs';
import type { PinyinSyllable } from './pinyin-guide';

const data = authored as unknown as TonePairData;
const syllables = inventory.syllables as PinyinSyllable[];
const base: Word = { id: 'test-word', hanzi: '你好', pinyin: 'nǐhǎo', meaning: 'hello', type: '', collection: '', level: '', sentence: '', translation: '', entryKind: 'word', audio: { url: 'https://example.test/exact.mp3', source: 'Shtooka / Yue Tan', license: 'CC BY-SA 3.0' } };
describe('recorded two-character tone associations', () => {
  it('pairs each character with its own recorded syllable and preserves the whole-word audio', () => {
    const row = vocabularyToneExample(base, syllables);
    expect(row?.chartLinks.map(l => l.reading)).toEqual(['nǐ', 'hǎo']);
    expect(row?.pair).toBe('3-3');
    expect(row?.expectedSpokenTones).toEqual([2, 3]);
    expect(row?.vocabularyEntryId).toBe('test-word');
    expect(row?.audio.url).toBe('https://example.test/exact.mp3');
  });
  it('does not create tone cards for unrecorded words, phrases or mismatched syllable counts', () => {
    expect(vocabularyToneExample({ ...base, audio: null }, syllables)).toBeNull();
    expect(vocabularyToneExample({ ...base, entryKind: 'phrase' }, syllables)).toBeNull();
    expect(vocabularyToneExample({ ...base, pinyin: 'nǐ' }, syllables)).toBeNull();
  });
  it('adds existing recorded words without replacing authored IDs or duplicating exact records', () => {
    const enriched = enrichTonePairs(data, words, syllables);
    expect(enriched.examples.length).toBeGreaterThan(48);
    expect(enriched.examples.slice(0, 48)).toEqual(data.examples);
    expect(new Set(enriched.examples.map(e => e.vocabularyEntryId)).size).toBe(enriched.examples.length);
    for (const row of enriched.examples.slice(48)) {
      const word = words.find(w => w.id === row.vocabularyEntryId);
      expect(row.audio.url).toBe(word?.audio?.url);
      expect(row.sourceReading).toBe(word?.pinyin);
    }
  });
});