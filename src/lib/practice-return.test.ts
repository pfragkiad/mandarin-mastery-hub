import { describe, expect, it } from 'vitest';
import { originLabel } from './practice-return';

// Practice's Back link names the page it returns to.
describe('originLabel', () => {
  it('names the Glyphs tab Practice was opened from', () => {
    expect(originLabel('/characters?tab=Components&id=x')).toBe('Components');
    expect(originLabel('/characters?id=Characters:我')).toBe('Characters');
  });
  it('names Words or Phrases for Vocabulary', () => {
    expect(originLabel('/vocabulary?tab=phrase')).toBe('Phrases');
    expect(originLabel('/vocabulary?word=w1')).toBe('Words');
  });
  it('falls back to Back without a known origin', () => {
    expect(originLabel(null)).toBe('Back');
    expect(originLabel('/somewhere')).toBe('Back');
  });
});
