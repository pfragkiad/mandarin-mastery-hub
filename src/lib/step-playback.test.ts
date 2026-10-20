import { describe, expect, it } from 'vitest';
import { nextStepIndex } from './step-playback';

describe('step-by-step playback', () => {
  it('advances one stroke at a time', () => {
    expect(nextStepIndex(0, 3)).toBe(0);
    expect(nextStepIndex(1, 3)).toBe(1);
    expect(nextStepIndex(2, 3)).toBe(2);
  });

  it('wraps back to the first stroke after the last one', () => {
    expect(nextStepIndex(3, 3)).toBe(0);
  });

  it('stays at the first stroke when there is nothing to draw', () => {
    expect(nextStepIndex(0, 0)).toBe(0);
  });
});
