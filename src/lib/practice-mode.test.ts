import { describe, expect, it } from 'vitest';
import { practiceMode, practiceModeOptions } from './practice-mode';

describe('practice modes', () => {
  it('defaults to Trace (Watch merged into Trace) and accepts Recall', () => {
    expect(practiceMode(undefined)).toBe('trace');
    expect(practiceMode('trace')).toBe('trace');
    expect(practiceMode('recall')).toBe('recall');
    expect(practiceMode('other')).toBe('trace');
    expect(practiceMode('watch')).toBe('trace');
  });
  it('Recall never supplies an outline or automatic quiz hint', () => {
    expect(practiceModeOptions('recall')).toEqual({ showOutline: false, showHintAfterMisses: false, highlightOnComplete: false });
  });
});