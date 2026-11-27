import { describe, expect, it } from 'vitest';
import { ALL_IDIOM_BANDS, filterIdioms, idiomsForCharacter, idiomToWord, matchesIdiomBand, type IdiomRankClass } from './idioms';
import { orderLibrary } from './library-order';
import { randomOverviewIdiom } from './overview';

const bands: IdiomRankClass[] = [
  { id: '1-100', label: 'Top 100', from: 1, to: 100, bandCoveragePct: 17.64, cumulativePct: 17.64 },
  { id: '101-300', label: '101–300', from: 101, to: 300, bandCoveragePct: 16.88, cumulativePct: 34.52 },
];

const sample = [
  idiomToWord({ id: 'idiom-1', rank: 1, hanzi: '坚定不移', traditional: '堅定不移', pinyin: 'jiān dìng bù yí', meaning: 'firm and unwavering', score: 100, docFreq: 54113, cumPct: 0.53, topic: 'Qualities, Feelings & Evaluation', subtopics: ['emotions-attitudes'] }, 'THUOCL'),
  idiomToWord({ id: 'idiom-2', rank: 2, hanzi: '随时随地', traditional: '隨時隨地', pinyin: 'suí shí suí dì', meaning: 'anytime and anywhere', score: 97.04, docFreq: 52510, cumPct: 1.04, topic: 'Time & Calendar', topics: ['Time & Calendar', 'Places & Directions'], subtopics: ['position-direction'] }, 'THUOCL'),
  idiomToWord({ id: 'idiom-150', rank: 150, hanzi: '画蛇添足', traditional: '畫蛇添足', pinyin: 'huà shé tiān zú', meaning: 'ruin the effect by adding what is superfluous', score: 25.1, docFreq: 13580, cumPct: 22.1 }, 'THUOCL'),
];

describe('idioms helpers', () => {
  it('matches frequency rank bands inclusively', () => {
    expect(matchesIdiomBand(sample[0]!, ALL_IDIOM_BANDS, bands)).toBe(true);
    expect(matchesIdiomBand(sample[0]!, '1-100', bands)).toBe(true);
    expect(matchesIdiomBand(sample[2]!, '1-100', bands)).toBe(false);
    expect(matchesIdiomBand(sample[2]!, '101-300', bands)).toBe(true);
  });

  it('filters idioms by band, query, and saved state', () => {
    expect(filterIdioms(sample, bands, '', '1-100', 'All words', []).map(w => w.id)).toEqual(['idiom-1', 'idiom-2']);
    expect(filterIdioms(sample, bands, 'unwavering', ALL_IDIOM_BANDS, 'All words', []).map(w => w.id)).toEqual(['idiom-1']);
    expect(filterIdioms(sample, bands, '', ALL_IDIOM_BANDS, 'Saved words', ['idiom-150']).map(w => w.id)).toEqual(['idiom-150']);
  });

  it('widens a band to every more frequent rank when "include lower ranks" is on', () => {
    // Rank 1 and 2 sit above the selected 101–300 band; widening pulls them in.
    expect(matchesIdiomBand(sample[0]!, '101-300', bands, true)).toBe(true);
    expect(matchesIdiomBand(sample[2]!, '101-300', bands, true)).toBe(true);
    // Widening never reaches past the selected band's own end.
    expect(matchesIdiomBand(sample[2]!, '1-100', bands, true)).toBe(false);
    expect(filterIdioms(sample, bands, '', '101-300', 'All words', [], false, false, true).map(w => w.id)).toEqual(['idiom-1', 'idiom-2', 'idiom-150']);
    expect(filterIdioms(sample, bands, '', '101-300', 'All words', [], false, false, false).map(w => w.id)).toEqual(['idiom-150']);
  });

  it('orders idioms by frequency rank by default and by pinyin when requested', () => {
    expect(orderLibrary(sample, 'rank').map(w => w.id)).toEqual(['idiom-1', 'idiom-2', 'idiom-150']);
    expect(orderLibrary(sample, 'pinyin').map(w => w.id)).toEqual(['idiom-150', 'idiom-1', 'idiom-2']);
  });

  it('filters idioms by topic and subtopic', () => {
    expect(filterIdioms(sample, bands, '', ALL_IDIOM_BANDS, 'All words', [], false, false, false, 'All collections', 'emotions-attitudes').map(w => w.id)).toEqual(['idiom-1']);
    expect(filterIdioms(sample, bands, '', ALL_IDIOM_BANDS, 'All words', [], false, false, false, 'Places & Directions', 'position-direction').map(w => w.id)).toEqual(['idiom-2']);
    expect(filterIdioms(sample, bands, '', ALL_IDIOM_BANDS, 'All words', [], false, false, false, 'Time & Calendar', 'emotions-attitudes')).toEqual([]);
  });

  it('returns the 2 highest-ranked idioms containing a character', () => {
    const pool = [
      idiomToWord({ id: 'idiom-300', rank: 300, hanzi: '一举两得', pinyin: 'yī jǔ liǎng dé', meaning: 'kill two birds with one stone' }, 'THUOCL'),
      idiomToWord({ id: 'idiom-10', rank: 10, hanzi: '一帆风顺', pinyin: 'yī fān fēng shùn', meaning: 'smooth sailing' }, 'THUOCL'),
      idiomToWord({ id: 'idiom-50', rank: 50, hanzi: '一心一意', pinyin: 'yī xīn yī yì', meaning: 'wholeheartedly' }, 'THUOCL'),
      ...sample,
    ];
    expect(idiomsForCharacter(pool, '一').map(w => w.id)).toEqual(['idiom-10', 'idiom-50']);
    expect(idiomsForCharacter(pool, '堅', 'Traditional').map(w => w.id)).toEqual(['idiom-1']);
    expect(idiomsForCharacter(pool, '龍').map(w => w.id)).toEqual([]);
  });

  it('picks Start random idioms only from the top 3 rank classes', () => {
    const fourBands: IdiomRankClass[] = [
      { id: '1-100', label: 'Top 100', from: 1, to: 100, bandCoveragePct: 17.64, cumulativePct: 17.64 },
      { id: '101-300', label: '101–300', from: 101, to: 300, bandCoveragePct: 16.88, cumulativePct: 34.52 },
      { id: '301-500', label: '301–500', from: 301, to: 500, bandCoveragePct: 10.89, cumulativePct: 45.41 },
      { id: '501-1000', label: '501–1,000', from: 501, to: 1000, bandCoveragePct: 17.43, cumulativePct: 62.84 },
    ];
    const pool = [
      idiomToWord({ id: 'idiom-100', rank: 100, hanzi: '卓有成效', pinyin: 'zhuó yǒu chéng xiào', meaning: 'highly effective' }, 'THUOCL'),
      idiomToWord({ id: 'idiom-500', rank: 500, hanzi: '一言为定', pinyin: 'yī yán wéi dìng', meaning: 'settled' }, 'THUOCL'),
      idiomToWord({ id: 'idiom-501', rank: 501, hanzi: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: 'gild the lily' }, 'THUOCL'),
    ];
    expect(randomOverviewIdiom(pool, fourBands, undefined, () => 0.99)?.id).toBe('idiom-500');
    expect(randomOverviewIdiom(pool, fourBands, 'idiom-500', () => 0.5)?.id).toBe('idiom-100');
  });
  it('matches a whole word in an idiom, not its separated characters', () => {
    expect(idiomsForCharacter(sample, '坚定').map(w => w.id)).toEqual(['idiom-1']);
    expect(idiomsForCharacter(sample, '堅定', 'Traditional').map(w => w.id)).toEqual(['idiom-1']);
    expect(idiomsForCharacter(sample, '随地').map(w => w.id)).toEqual(['idiom-2']);
    expect(idiomsForCharacter(sample, '时地')).toEqual([]);
  });
  it('provides every exact ranked idiom for Show all without the preview limit', () => {
    const pool = [300, 10, 50, 500].map(rank => idiomToWord({ id: `idiom-${rank}`, rank, hanzi: '一心一意', pinyin: 'yī xīn yī yì', meaning: 'wholeheartedly' }, 'THUOCL'));
    expect(idiomsForCharacter(pool, '一', undefined, Infinity).map(row => row.id)).toEqual(['idiom-10', 'idiom-50', 'idiom-300', 'idiom-500']);
  });
});