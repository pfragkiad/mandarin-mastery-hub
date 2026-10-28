import { describe, expect, it } from 'vitest';
import { practiceMode, practiceModeOptions } from './practice-mode';

describe('practice modes', () => {
  it('defaults to Watch and accepts Trace and Recall', () => {
    expect(practiceMode(undefined)).toBe('watch');
    expect(practiceMode('trace')).toBe('trace');
    expect(practiceMode('recall')).toBe('recall');
    expect(practiceMode('other')).toBe('watch');
  });
  it('Recall never supplies an outline or automatic quiz hint', () => {
    expect(practiceModeOptions('recall')).toEqual({ showOutline: false, showHintAfterMisses: false, highlightOnComplete: false });
  });
});