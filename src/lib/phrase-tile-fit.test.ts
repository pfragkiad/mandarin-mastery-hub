import { describe, expect, it } from 'vitest';
import { phraseTileLines } from './phrase-tile-fit';

describe('phraseTileLines', () => {
  it('keeps up to 12 glyphs (punctuation included) on one line', () => {
    expect(phraseTileLines('请问，您是哪位？')).toEqual(['请问，您是哪位？']);
    expect(phraseTileLines('一二三四五六七八九十一二')).toHaveLength(1);
  });

  it('uses two lines for 13–24 glyphs and three for 25–36', () => {
    expect(phraseTileLines('一二三四五六七八九十一二三')).toHaveLength(2);
    expect(phraseTileLines('一'.repeat(24))).toHaveLength(2);
    expect(phraseTileLines('一'.repeat(25))).toHaveLength(3);
    expect(phraseTileLines('一'.repeat(36))).toHaveLength(3);
  });

  it('adds lines beyond 36 glyphs instead of exceeding 12 per line', () => {
    const lines = phraseTileLines('一'.repeat(40));
    expect(lines).toHaveLength(4);
    expect(Math.max(...lines.map(l => Array.from(l).length))).toBeLessThanOrEqual(12);
  });

  it('prefers breaking right after punctuation', () => {
    expect(phraseTileLines('我们明天下午见面，然后一起去吃饭')).toEqual(['我们明天下午见面，', '然后一起去吃饭']);
  });

  it('breaks at a matched word edge, not inside a word, when there is no punctuation', () => {
    // 15 glyphs; an even 8+7 split would land inside 图书馆 (glyphs 7–9).
    const text = '我们下午一起去图书馆看书吧好吗';
    const lines = phraseTileLines(text, [[0, 2], [2, 4], [4, 6], [6, 7], [7, 10], [10, 11], [11, 12]]);
    expect(lines.join('')).toBe(text);
    expect(lines.some(l => l.endsWith('图') || l.endsWith('图书'))).toBe(false);
  });

  it('never starts a line with closing punctuation or ends one with an opening mark', () => {
    const lines = phraseTileLines('一二三四五六七，八九十一二三四五');
    for (const line of lines.slice(1)) expect(/^[，。？！、；：）」』”’》]/.test(line)).toBe(false);
    const quoted = phraseTileLines('一二三四五六“七八九十一二三”四');
    for (const line of quoted) expect(/[“《（]$/.test(line)).toBe(false);
  });
});
