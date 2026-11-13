import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSearchableQuery, searchAll, startSearchMode } from './site-search';
import { words } from './mandarin';
import * as frequency from './usage-frequency';

afterEach(() => vi.restoreAllMocks());

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
  it('lists words first, glyphs next and explicit phrases last', () => {
    const word = { id: 'search-word', hanzi: '水词', pinyin: 'shui', meaning: 'water word', translation: '', type: 'noun', collection: 'test', level: '', sentence: '', entryKind: 'word' as const };
    const phrase = { ...word, id: 'search-phrase', hanzi: '水短语', entryKind: 'phrase' as const };
    const hits = searchAll([phrase, word], '水', false, 10000);
    expect(hits[0]).toEqual({ kind: 'Word', word });
    expect(hits.slice(1, -1).length).toBeGreaterThan(0);
    expect(hits.slice(1, -1).every(hit => hit.kind !== 'Word')).toBe(true);
    expect(hits.at(-1)).toEqual({ kind: 'Word', word: phrase });
  });
  it('puts a rank 1 component before a rank 100 character and unranked glyphs', () => {
    vi.spyOn(frequency, 'usageRank').mockImplementation((entry, kind) =>
      entry.hanzi === '氵' && kind === 'Components' ? 1 : entry.hanzi === '水' && kind === 'Characters' ? 100 : null);
    const hits = searchAll([], 'shui', false, 10000);
    expect(hits[0]).toMatchObject({ kind: 'Component', hanzi: '氵' });
    expect(hits[1]).toMatchObject({ kind: 'Character', hanzi: '水' });
  });
  it('uses the selected Traditional rank scope', () => {
    const rank = vi.spyOn(frequency, 'usageRank').mockReturnValue(null);
    searchAll([], 'shui', true);
    expect(rank).toHaveBeenCalled();
    expect(rank.mock.calls.every(call => call[2] === true)).toBe(true);
    rank.mockClear();
    searchAll([], 'shui', false);
    expect(rank).toHaveBeenCalled();
    expect(rank.mock.calls.every(call => call[2] === false)).toBe(true);
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
  it('returns every match without the 50-result preview cap for expansion', () => {
    const all = searchAll(words, 'e', false, Infinity);
    expect(all.length).toBeGreaterThan(50);
    expect(all.slice(0, 50)).toEqual(searchAll(words, 'e', false, 50));
    expect(all).toEqual(searchAll(words, 'e', false, 100000));
  });
  it('matches readings only when the pinyin toggle is on, and whole readings when exact', () => {
    // Pinyin mode drops hanzi/meaning free text, so an English word finds nothing.
    expect(searchAll(words, 'hello', false, 1000, 'pinyin')).toEqual([]);
    // Exact mode keeps the same tone-number logic as the library filters.
    const exact = searchAll([], 'shi4', false, 1000, 'exact');
    expect(exact.some(hit => hit.kind !== 'Word' && hit.hanzi === '是')).toBe(true);
    expect(exact.some(hit => hit.kind !== 'Word' && hit.hanzi === '十')).toBe(false);
  });
  it.each(['pinyin', 'exact'] as const)('excludes translation-only reference matches in %s mode', mode => {
    const hits = searchAll(words, 'qu', false, 10000, mode);
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '取')).toBe(true);
    // 后 (queen) and 咨 (inquire) contain qu only in their English meanings.
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '后')).toBe(false);
    expect(hits.some(hit => hit.kind !== 'Word' && hit.hanzi === '咨')).toBe(false);
  });
});

describe('Start page search rules', () => {
  const water = { id: 'rule-word', hanzi: '水果', pinyin: 'shuǐ guǒ', meaning: 'fruit', translation: 'I like water.', type: 'noun', collection: 'test', level: '', sentence: '', entryKind: 'word' as const };
  it('never searches a single Latin letter', () => {
    expect(isSearchableQuery('c')).toBe(false);
    expect(isSearchableQuery(' c ')).toBe(false);
    expect(isSearchableQuery('ca')).toBe(true);
  });
  it('searches a single hanzi', () => {
    expect(isSearchableQuery('水')).toBe(true);
  });
  it('hanzi input searches written forms whatever the switch says', () => {
    expect(startSearchMode('水', 'english', false)).toBe('hanzi');
    expect(startSearchMode('水', 'pinyin', true)).toBe('hanzi');
    expect(startSearchMode('shui', 'pinyin', true)).toBe('exact');
    expect(startSearchMode('shui', 'english', true)).toBe('english');
  });
  it('hanzi search finds records containing the hanzi', () => {
    expect(searchAll([water], '水', false, 100, 'hanzi')).toContainEqual({ kind: 'Word', word: water });
  });
  it('English search matches meanings, not readings or sentence translations', () => {
    expect(searchAll([water], 'fruit', false, 100, 'english')).toContainEqual({ kind: 'Word', word: water });
    expect(searchAll([water], 'shui', false, 100, 'english')).not.toContainEqual({ kind: 'Word', word: water });
    expect(searchAll([water], 'water', false, 100, 'english')).not.toContainEqual({ kind: 'Word', word: water });
  });
  it('Pinyin search matches readings, not meanings', () => {
    expect(searchAll([water], 'shui', false, 100, 'pinyin')).toContainEqual({ kind: 'Word', word: water });
    expect(searchAll([water], 'fruit', false, 100, 'pinyin')).not.toContainEqual({ kind: 'Word', word: water });
  });
});
