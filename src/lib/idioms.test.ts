import { describe, expect, it } from 'vitest';
import { ALL_IDIOM_BANDS, filterIdioms, idiomToWord, matchesIdiomBand, type IdiomRankClass } from './idioms';
import { orderLibrary } from './library-order';

const bands: IdiomRankClass[] = [
  { id: '1-100', label: 'Top 100', from: 1, to: 100, bandCoveragePct: 17.64, cumulativePct: 17.64 },
  { id: '101-300', label: '101–300', from: 101, to: 300, bandCoveragePct: 16.88, cumulativePct: 34.52 },
];

const sample = [
  idiomToWord({ id: 'idiom-1', rank: 1, hanzi: '坚定不移', traditional: '堅定不移', pinyin: 'jiān dìng bù yí', meaning: 'firm and unwavering', score: 100, docFreq: 54113, cumPct: 0.53 }, 'THUOCL'),
  idiomToWord({ id: 'idiom-2', rank: 2, hanzi: '随时随地', traditional: '隨時隨地', pinyin: 'suí shí suí dì', meaning: 'anytime and anywhere', score: 97.04, docFreq: 52510, cumPct: 1.04 }, 'THUOCL'),
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
});