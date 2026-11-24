import { describe, expect, it } from 'vitest';
import type { CardReveal } from './learning-preferences';
import { faceViewToReveal, nextFaceView, restoredFaceView, revealToFaceView } from './face-view';

describe('face view (Hanzi · Pinyin · EN switches)', () => {
  it('maps every grid reveal mode to three switches and back', () => {
    const modes: CardReveal[] = ['all', 'meaning', 'hanzi', 'pinyin', 'pinyin-meaning', 'hanzi-pinyin', 'hanzi-meaning'];
    for (const mode of modes) expect(faceViewToReveal(revealToFaceView(mode))).toBe(mode);
  });

  it('"Show only Hanzi" is hanzi on, pinyin and translation off', () => {
    expect(revealToFaceView('pinyin-meaning')).toEqual({ hanzi: true, pinyin: false, translations: false });
  });

  it('hiding hanzi and translation is the new "pinyin only" grid mode', () => {
    expect(faceViewToReveal({ hanzi: false, pinyin: true, translations: false })).toBe('hanzi-meaning');
  });

  it('hiding all three has no grid mode', () => {
    expect(faceViewToReveal({ hanzi: false, pinyin: false, translations: false })).toBeNull();
  });

  it('a saved lesson choice with nothing shown restores everything shown', () => {
    expect(restoredFaceView({ hanzi: false, pinyin: false, translations: false })).toEqual({ hanzi: true, pinyin: true, translations: true });
    expect(restoredFaceView({ hanzi: false, pinyin: true, translations: true })).toEqual({ hanzi: false, pinyin: true, translations: true });
  });

  it('the last shown face cannot be switched off', () => {
    const onlyHanzi = { hanzi: true, pinyin: false, translations: false };
    expect(nextFaceView(onlyHanzi, 'hanzi')).toEqual(onlyHanzi);
    expect(nextFaceView(onlyHanzi, 'pinyin')).toEqual({ hanzi: true, pinyin: true, translations: false });
  });
});
