import { describe, expect, it } from 'vitest';
import { words, vocabularyKind } from './mandarin';

describe('vocabulary categories', () => {
  it('uses the recorded word category for 爸爸', () => {
    const word = words.find(w => w.hanzi === '爸爸');
    if (!word) throw new Error('Imported word missing');
    expect(vocabularyKind(word)).toBe('word');
  });
  it('uses the recorded phrase category for 我受够了', () => {
    const phrase = words.find(w => w.hanzi === '我受够了');
    if (!phrase) throw new Error('Imported phrase missing');
    expect(vocabularyKind(phrase)).toBe('phrase');
  });
  it('keeps personally added phrases in the phrase category', () => {
    expect(vocabularyKind({ id: 'personal', hanzi: '你好', pinyin: '', meaning: 'Hello', type: '', collection: '', level: '', sentence: '', translation: '', entryKind: 'phrase' })).toBe('phrase');
  });
});