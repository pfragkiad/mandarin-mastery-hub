import { describe, expect, it } from 'vitest';
import { searchAll } from './site-search';
import { words } from './mandarin';

describe('Header search across the library', () => {
  it('finds words by their English meaning', () => {
    const hits = searchAll(words, 'hello');
    expect(hits[0]?.kind).toBe('Word');
    expect(hits[0]?.kind === 'Word' ? hits[0].word.hanzi : '').toBe('你好');
  });
  it('lists glyph hits before word hits', () => {
    expect(searchAll(words, 'water')[0]?.kind).not.toBe('Word');
  });
  it('finds a word by Chinese characters', () => {
    const hits = searchAll(words, '学习');
    expect(hits[0]?.kind === 'Word' ? hits[0].word.hanzi : '').toBe('学习');
  });
  it('finds reference entries by pinyin without tones', () => {
    // Isolate reference matching from the capped vocabulary results as the dataset grows.
    const hits = searchAll([], 'shui');
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '氵')).toBe(true);
  });
  it('returns nothing for an empty or unknown query', () => {
    expect(searchAll(words, '   ')).toEqual([]);
    expect(searchAll(words, 'zzz')).toEqual([]);
  });
  it('caps the result list', () => {
    expect(searchAll(words, 'e', false, 8)).toHaveLength(8);
  });
});
