import { describe, expect, it } from 'vitest';
import { orderLibrary, orderVocabulary, newShuffleSeed, shuffleSeed } from './library-order';
const deck = Array.from({ length: 100 }, (_, index) => ({ id: `Characters:${index}`, pinyin: 'mā', hsk: 100 - index }));
describe('library sorting', () => {
  it('defaults vocabulary to the recorded HSK index order, non-HSK last in existing order', () => {
    // hskId 1 is 'mā' and hskId 2 is 'ā', so HSK-index order must differ from Pinyin order.
    const entries = [{ id: 'z', pinyin: 'zài', hskId: null }, { id: 'ma', pinyin: 'mā', hskId: 1 }, { id: 'a', pinyin: 'ā', hskId: 2 }, { id: 'b', pinyin: 'bā', hskId: null }];
    expect(orderVocabulary(entries).map(entry => entry.id)).toEqual(['ma', 'a', 'z', 'b']);
    // An explicit Pinyin pick orders the whole pool, so non-HSK entries interleave.
    expect(orderVocabulary(entries, 'pinyin').map(entry => entry.id)).toEqual(['a', 'b', 'ma', 'z']);
    expect(orderVocabulary(entries.filter(entry => entry.hskId === null))).toEqual([entries[0], entries[3]]);
  });
  it('defaults to supplied frequency order without inventing ranks', () => { expect(orderLibrary(deck)).toEqual(deck); });
  it('shuffles the whole deck with no repeated or missing cards across pages', () => {
    const shuffled = orderLibrary(deck, 'random', 12345);
    const pages = Array.from({ length: 10 }, (_, page) => shuffled.slice(page * 10, page * 10 + 10)).flat();
    expect(new Set(pages.map(entry => entry.id)).size).toBe(100);
    expect(pages).toEqual(shuffled);
    expect(shuffled).not.toEqual(deck);
    expect(orderLibrary(deck, 'random', 12345)).toEqual(shuffled);
    expect(orderLibrary(deck, 'random', 12346)).not.toEqual(shuffled);
  });
  it('keeps filtered survivors in their whole-deck order', () => {
    expect(orderLibrary(deck.filter(entry => entry.hsk < 30), 'random', 42)).toEqual(orderLibrary(deck, 'random', 42).filter(entry => entry.hsk < 30));
  });
  it('orders primary pinyin by syllable then tones 1/2/3/4/neutral, missing last', () => {
    const readings = ['', 'ma', 'mà', 'mǎ / má', 'má', 'mā', 'ā'].map(pinyin => ({ id: pinyin, pinyin }));
    expect(orderLibrary(readings, 'pinyin').map(entry => entry.pinyin)).toEqual(['ā', 'mā', 'má', 'mǎ / má', 'mà', 'ma', '']);
  });
  it('orders recorded HSK indices ascending, missing last', () => {
    const entries = [{ id: 'missing', pinyin: '', hsk: null }, { id: '289', pinyin: '', hsk: 289 }, { id: '1', pinyin: '', hsk: 1 }];
    expect(orderLibrary(entries, 'hsk', 1, entry => entry.hsk).map(entry => entry.id)).toEqual(['1', '289', 'missing']);
  });
  it('validates URL seeds and reshuffle changes the seed', () => {
    expect(shuffleSeed('12345')).toBe(12345);
    expect(shuffleSeed(-1)).toBeUndefined();
    expect(shuffleSeed(1.5)).toBeUndefined();
    expect(shuffleSeed(0x100000000)).toBeUndefined();
    expect(newShuffleSeed(12345)).not.toBe(12345);
  });
});
