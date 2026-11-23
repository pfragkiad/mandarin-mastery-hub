import { describe, expect, it } from 'vitest';
import { parseAnswerLines } from './lesson-answer';

describe('parseAnswerLines', () => {
  it('splits a dialogue answer into speaker turns', () => {
    const lines = parseAnswerLines('A: 你好！ (Nǐ hǎo!) — Hello!\nB: 不客气！ (Bú kèqi!) — You are welcome!');
    expect(lines).toEqual([
      { kind: 'sentence', speaker: 'A', hanzi: '你好！', pinyin: 'Nǐ hǎo!', english: 'Hello!' },
      { kind: 'sentence', speaker: 'B', hanzi: '不客气！', pinyin: 'Bú kèqi!', english: 'You are welcome!' },
    ]);
  });
  it('reads a single sentence without English', () => {
    expect(parseAnswerLines('对不起 (duìbuqǐ)')).toEqual([{ kind: 'sentence', speaker: null, hanzi: '对不起', pinyin: 'duìbuqǐ', english: '' }]);
  });
  it('keeps English prose verbatim', () => {
    expect(parseAnswerLines('Earlier residence; current location is unspecified.')).toEqual([{ kind: 'text', text: 'Earlier residence; current location is unspecified.' }]);
  });
});
