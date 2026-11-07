import { describe, expect, it } from 'vitest';
import { wordTileFit } from './word-card';

describe('wordTileFit', () => {
  it('keeps up to 4 characters on one line', () => {
    for (const w of ['好', '爸爸', '不客气', '一路平安']) expect(wordTileFit(w).lines).toBe(1);
  });
  it('splits 5+ characters evenly over two lines', () => {
    expect(wordTileFit('对不起您好').lines).toBe(2);
    expect(wordTileFit('对不起您好').style).toMatchObject({ '--tile-per-line': 3 });
    expect(wordTileFit('一二三四五六').style).toMatchObject({ '--tile-per-line': 3 });
  });
  it('splits 5+ glyphs top-heavy with no orphan line', () => {
    expect(wordTileFit('对不起您好').parts).toEqual(['对不起', '您好']);
    expect(wordTileFit('一二三四五六').parts).toEqual(['一二三', '四五六']);
    expect(wordTileFit('一二三四五六七').parts).toEqual(['一二三四', '五六七']);
    expect(wordTileFit('一二三四五六七八').parts).toEqual(['一二三四', '五六七八']);
  });
  it('shrinks 3 and 4 character words to fit one line', () => {
    expect(wordTileFit('不客气').style).toMatchObject({ '--tile-size': '53px' });
    expect(wordTileFit('一路平安').style).toMatchObject({ '--tile-size': '40px' });
  });
});
