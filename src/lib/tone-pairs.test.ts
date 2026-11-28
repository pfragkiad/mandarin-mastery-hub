// Tone pairs / Tone changes rules from the owner's handoff: dictionary grouping (3+3 stays
// 3+3 while the speech draft says 2+3), 一/不 outside the matrix, neutral = 5, exact
// vocabulary bindings with their own recordings, and URL values that fail closed.
import { describe, expect, it } from 'vitest';
import data from '@/data/pinyin/tone-pairs.json';
import { vocabularyData } from './data-contract';
import inventory from '@/data/pinyin/inventory.json';
import { FIRST_TONES, SECOND_TONES, matrixPairOrder, nextExample, pairLabel, pairPool, rulePool, selectedExample, toneLabel, tonesChanged, validateToneChangesSearch, validateTonePairsSearch, type TonePairData } from './tone-pairs';

const tp = data as unknown as TonePairData;

describe('tone pair matrix', () => {
  it('has two recorded words in each of the 20 cells (first tone 1–4, second 1–4 or neutral)', () => {
    for (const a of FIRST_TONES) for (const b of SECOND_TONES) expect(pairPool(tp, `${a}-${b}`)).toHaveLength(2);
    expect(tp.examples.filter(e => e.inPairMatrix)).toHaveLength(40);
  });
  it('orders the card’s ‹ › pair walk like the grid and skips pairs with no words', () => {
    const keys = matrixPairOrder(pair => pairPool(tp, pair).length > 0);
    expect(keys).toEqual(FIRST_TONES.flatMap(a => SECOND_TONES.map(b => `${a}-${b}`)));
    expect(keys.indexOf('1-5')).toBe(4); // last cell of the first row, before 2 + 1
    expect(matrixPairOrder(pair => pair === '1-1' || pair === '3-3')).toEqual(['1-1', '3-3']);
    expect(matrixPairOrder(() => false)).toEqual([]);
  });
  it('keeps 水果 and 可以 in the dictionary 3 + 3 cell while their speech draft is 2 + 3', () => {
    const cell = pairPool(tp, '3-3');
    expect(cell.map(e => e.headword)).toEqual(['水果', '可以']);
    for (const e of cell) { expect(toneLabel(e.citationTones)).toBe('3 + 3'); expect(toneLabel(e.expectedSpokenTones)).toBe('2 + 3'); expect(tonesChanged(e)).toBe(true); }
    expect(rulePool(tp, 'third').map(e => e.headword)).toEqual(['水果', '可以']);
  });
  it('keeps 一 and 不 examples out of the matrix and under their own tone changes', () => {
    expect(rulePool(tp, 'yi').map(e => e.headword)).toEqual(['一些', '一直', '一起', '一共', '一定']);
    expect(rulePool(tp, 'bu').map(e => e.headword)).toEqual(['不要', '不错', '不行']);
    for (const e of [...rulePool(tp, 'yi'), ...rulePool(tp, 'bu')]) expect(e.inPairMatrix).toBe(false);
    expect(pairPool(tp, '1-4').map(e => e.headword)).not.toContain('一定');
  });
  it('shows a neutral ending as "neutral"', () => {
    expect(pairLabel('1-5')).toBe('1 + neutral');
    expect(pairPool(tp, '1-5').map(e => e.headword)).toEqual(['东西', '妈妈']);
  });
  it('不行 keeps its dictionary 4 + 2 with no change', () => {
    const e = rulePool(tp, 'bu').find(x => x.headword === '不行')!;
    expect(tonesChanged(e)).toBe(false);
  });
});

describe('exact bindings', () => {
  const vocab = new Map(vocabularyData.entries.map(e => [e.id, e]));
  const fold = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s/g, '');
  it('binds every example to its exact word card and that card’s own recording', () => {
    for (const e of tp.examples) {
      const record = vocab.get(e.vocabularyEntryId ?? '');
      expect(record, e.headword).toBeTruthy();
      expect(record!.simplified).toBe(e.headword);
      expect(fold(record!.pinyinDisplay)).toBe(fold(e.sourceReading));
      expect(record!.audio?.url).toBe(e.audio.url);
    }
  });
  it('links each syllable only to an attested Sound chart sound', () => {
    const tones = new Map(inventory.syllables.map(s => [s.base, s.tones as number[]]));
    for (const e of tp.examples) for (const l of e.chartLinks) expect(tones.get(l.base), l.reading).toContain(l.tone);
  });
  it('labels every example as an unreviewed draft', () => {
    for (const e of tp.examples) expect(e.reviewStatus).toBe('editorial_draft_audio_not_listening_reviewed');
  });
});

describe('URL search', () => {
  it('retains the current tone-change rule and example in a closed window URL', () => {
    expect(validateToneChangesSearch({ rule: 'bu', example: 'exact-word', closed: true })).toEqual({ rule: 'bu', example: 'exact-word', closed: true });
    expect(validateToneChangesSearch({ rule: 'yi', closed: '1' })).toEqual({ rule: 'yi', closed: true });
    expect(validateToneChangesSearch({ rule: 'yi', closed: 'yes' })).toEqual({ rule: 'yi' });
  });
  it('drops unknown pairs, rules and modes instead of guessing', () => {
    expect(validateTonePairsSearch({ pair: '5-1', listen: 'yes', speed: 'fast' })).toEqual({});
    expect(validateTonePairsSearch({ pair: '4-5', example: 'shtooka:cmn-799ef867', listen: 1, speed: 'slow' })).toEqual({ pair: '4-5', example: 'shtooka:cmn-799ef867', listen: true });
    expect(validateToneChangesSearch({ rule: 'sandhi' })).toEqual({});
    expect(validateToneChangesSearch({ rule: 'bu', listen: '1' })).toEqual({ rule: 'bu', listen: true });
  });
  it('restores the exact example only inside its own pool, and Next wraps round', () => {
    const cell = pairPool(tp, '4-5');
    expect(selectedExample(cell, cell[1]!.id)?.headword).toBe('弟弟');
    expect(selectedExample(cell, 'shtooka:cmn-481c5c0c')?.headword).toBe('爸爸');
    expect(nextExample(cell, cell[1]!.id)?.headword).toBe('爸爸');
  });
});
