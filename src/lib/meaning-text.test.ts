import { describe, expect, it } from 'vitest';
import { meaningParts } from '@/components/tutor/meaning-text';

describe('meaningParts', () => {
  it('italicizes parenthesised spans and keeps surrounding text', () => {
    const parts = meaningParts('friend (also companion) warmth');
    expect(parts).toEqual(['friend ', '(also companion)', ' warmth']);
    expect(parts[1] ?? '').startsWith('(')).toBe(true);
  });

  it('still splits component form descriptions', () => {
    const parts = meaningParts('Component form of 爪 friend');
    expect(parts[1]).toMatch(/^component form of/i);
  });

  it('treats text without parentheses or descriptions as a single part', () => {
    expect(meaningParts('friend, companion; fraternity')).toEqual(['friend, companion; fraternity']);
  });
});
