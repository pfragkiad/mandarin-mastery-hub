import { describe, expect, it } from 'vitest';
import { meaningPlacement } from './use-meaning-placement';

describe('detail translation placement', () => {
  it('stays beside the pinyin when both fit on one line', () => expect(meaningPlacement(600, 120, 400)).toBe('inline'));
  it('moves whole to the next line when it fits a full line but not beside the pinyin', () => expect(meaningPlacement(600, 120, 520)).toBe('below'));
  it('flows on after the pinyin and wraps when it is longer than a full line', () => expect(meaningPlacement(600, 120, 900)).toBe('flow'));
});
