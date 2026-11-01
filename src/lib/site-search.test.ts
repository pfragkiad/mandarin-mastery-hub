import { describe, expect, it } from 'vitest';
import { searchAll } from './site-search';
import { words } from './mandarin';

describe('Header search across the library', () => {
  it('retains Traditional metadata on the exact lion search result', () => {
    const hit = searchAll([], '獅', true).find(hit => hit.kind !== 'Word' && hit.hanzi === '獅');
    expect(hit?.kind !== 'Word' ? hit?.script : undefined).toBe('Traditional');
    expect(searchAll([], '獅', false)).toEqual([]);
  });
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
  it('finds fourth-tone reference readings with shi4, without matching other tones', () => {
    const hits = searchAll([], 'shi4', false, 1000);
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '是')).toBe(true);
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '十')).toBe(false);
  });
  it('finds vocabulary using numbered syllables', () => {
    const hits = searchAll(words, 'ni3hao3', false, 1000);
    expect(hits.some(hit => hit.kind === 'Word' && hit.word.hanzi === '你好')).toBe(true);
    expect(searchAll(words, 'ni4hao3', false, 1000).some(hit => hit.kind === 'Word' && hit.word.hanzi === '你好')).toBe(false);
  });
  it('caps the result list', () => {
    expect(searchAll(words, 'e', false, 8)).toHaveLength(8);
  });
  it('matches readings only when the pinyin toggle is on, and whole readings when exact', () => {
    // Pinyin mode drops hanzi/meaning free text, so an English word finds nothing.
    expect(searchAll(words, 'hello', false, 1000, 'pinyin')).toEqual([]);
    // Exact mode keeps the same tone-number logic as the library filters.
    const exact = searchAll([], 'shi4', false, 1000, 'exact');
    expect(exact.some(hit => hit.kind !== 'Word' && hit.hanzi === '是')).toBe(true);
    expect(exact.some(hit => hit.kind !== 'Word' && hit.hanzi === '十')).toBe(false);
  });
});
