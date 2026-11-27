import { describe, expect, it } from 'vitest';
import { exampleSearchMatches } from './example-search';

describe('Expanded example search', () => {
  const recorded = '目的地 mùdìdi destination';
  it('leaves results unfiltered below two characters and filters at two', () => {
    expect(exampleSearchMatches(recorded, 'x')).toBe(true);
    expect(exampleSearchMatches(recorded, ' x ')).toBe(true);
    expect(exampleSearchMatches(recorded, 'é')).toBe(true);
    expect(exampleSearchMatches(recorded, 'xx')).toBe(false);
  });
  it('allows a single Hanzi including supplementary characters', () => {
    expect(exampleSearchMatches(recorded, '目')).toBe(true);
    expect(exampleSearchMatches(recorded, '学')).toBe(false);
    expect(exampleSearchMatches(recorded, '𠮷')).toBe(false);
    expect(exampleSearchMatches('𠮷野', '𠮷')).toBe(true);
  });
  it('matches Hanzi', () => expect(exampleSearchMatches(recorded, '目的')).toBe(true));
  it('matches pinyin with or without tone marks', () => {
    expect(exampleSearchMatches(recorded, 'mudidi')).toBe(true);
    expect(exampleSearchMatches(recorded, 'mùdì')).toBe(true);
  });
  it('matches English case-insensitively', () => expect(exampleSearchMatches(recorded, 'DESTINATION')).toBe(true));
  it('excludes unrelated results', () => expect(exampleSearchMatches(recorded, 'school')).toBe(false));
});