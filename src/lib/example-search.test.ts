import { describe, expect, it } from 'vitest';
import { exampleSearchMatches } from './example-search';

describe('Expanded example search', () => {
  const recorded = '目的地 mùdìdi destination';
  it('matches Hanzi', () => expect(exampleSearchMatches(recorded, '目的')).toBe(true));
  it('matches pinyin with or without tone marks', () => {
    expect(exampleSearchMatches(recorded, 'mudidi')).toBe(true);
    expect(exampleSearchMatches(recorded, 'mùdì')).toBe(true);
  });
  it('matches English case-insensitively', () => expect(exampleSearchMatches(recorded, 'DESTINATION')).toBe(true));
  it('excludes unrelated results', () => expect(exampleSearchMatches(recorded, 'school')).toBe(false));
});