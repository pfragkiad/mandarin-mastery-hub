import { describe, expect, it } from 'vitest';
import { formatRankRange, parseRankRange, rankRangeMatches, rankSliderPosition, sliderPositionRank } from './rank-range';
import { parseGameUsageFilter, parseUsageGroup, usageRankMatches } from './usage-frequency';
import { drawingSearch } from './drawing-game';
import { matchesIdiomBand, idiomToWord } from './idioms';

describe('custom game rank ranges', () => {
  it('maps slider class stops without changing exact ranks', () => {
    const stops = [1, 100, 300, 500, 1000, 2000, 3500, 5000, 9933];
    expect(rankSliderPosition(300, stops)).toBe(2000);
    expect(sliderPositionRank(2000, stops)).toBe(300);
    expect(sliderPositionRank(rankSliderPosition(37, stops), stops)).toBe(37);
    expect(sliderPositionRank(8000, stops)).toBe(9933);
  });
  it('matches arbitrary inclusive From/To ranks without changing source classes', () => {
    const range = parseRankRange(formatRankRange(37, 300));
    expect(range).toEqual({ min: 37, max: 300, unranked: false });
    expect(usageRankMatches('Characters', 36, 'range:37-300')).toBe(false);
    expect(usageRankMatches('Characters', 37, 'range:37-300')).toBe(true);
    expect(usageRankMatches('Characters', 300, 'range:37-300')).toBe(true);
    expect(usageRankMatches('Characters', 301, 'range:37-300')).toBe(false);
    expect(parseUsageGroup('Characters', 'range:37-300')).toBeUndefined();
  });
  it('includes missing ranks only with explicit Unranked selection', () => {
    expect(usageRankMatches('Components', null, 'range:1-300')).toBe(false);
    expect(usageRankMatches('Components', null, 'range:1-300+unranked')).toBe(true);
    const range = parseRankRange('range:1-300+unranked');
    if (!range) throw new Error('Expected valid range');
    expect(rankRangeMatches(301, range)).toBe(false);
  });
  it('preserves custom rank filters in Drawing URLs for all glyph kinds', () => {
    for (const kind of ['Characters', 'Components', 'Radicals']) {
      expect(drawingSearch({ kind, usage: 'range:37-300+unranked' }).usage).toBe('range:37-300+unranked');
    }
    expect(drawingSearch({ usage: 'range:37-300' }).usage).toBe('range:37-300');
    expect(drawingSearch({ kind: 'Words', usage: 'range:37-300' }).usage).toBeUndefined();
  });
  it('rejects invalid custom ranges without replacing recorded group IDs', () => {
    for (const value of ['range:0-300', 'range:300-1', 'range:1.5-300', 'range:1-NaN']) {
      expect(parseRankRange(value)).toBeUndefined();
      expect(parseGameUsageFilter('Characters', value)).toBeUndefined();
    }
    expect(parseGameUsageFilter('Characters', '101-300')).toBe('101-300');
  });
  it('uses each idiom record’s own rank for arbitrary ranges', () => {
    const word = idiomToWord({ id: 'idiom:record', hanzi: '一心一意', pinyin: 'yī xīn yī yì', meaning: 'single-minded', rank: 37 }, 'Recorded source');
    expect(matchesIdiomBand(word, 'range:37-300', [])).toBe(true);
    expect(matchesIdiomBand(word, 'range:38-300', [])).toBe(false);
  });
});