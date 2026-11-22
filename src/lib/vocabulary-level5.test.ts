import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { vocabularyData, sentencePhraseEntries } from './data-contract';
import { vocabularyFacetOptions, vocabularyKind, words } from './mandarin';

const raw = readFileSync('importer/hsk/hsk3_level5_1.0.1.json');
const source = JSON.parse(raw.toString());
const level5 = vocabularyData.entries.filter(e => e.hskLevel === 5);

describe('Level 5 draft terms', () => {
  it('exposes every exact syllabus identity and its recorded draft fields', () => {
    expect(level5).toHaveLength(1600);
    expect(level5.map(e => e.hsk_index)).toEqual(source.entries.map((e: { id: number }) => e.id));
    for (const entry of level5) {
      const recorded = source.entries.find((e: { id: number }) => e.id === entry.hsk_index);
      expect(entry.simplified).toBe(recorded.headword);
      expect(entry.pinyinDisplay).toBe(recorded.pinyin);
      expect(entry.studyMetadata?.sourceSha256).toBe(createHash('sha256').update(raw).digest('hex'));
      expect(entry.contentStatus).toBe('draft');
      expect(entry.studyMetadata?.verificationStatus).toBe(source.verification.status);
      expect(entry.examples.map(ex => [ex.simplified, ex.pinyinDisplay, ex.english, ex.notes, ex.register])).toEqual(
        recorded.examples.map((ex: { hanzi: string; pinyin: string; english: string; note: string; register: string }) =>
          [ex.hanzi, ex.pinyin, ex.english, ex.note, ex.register]));
      expect(entry.audio).toBeNull();
    }
  });
  it('offers Level 5 word and sentence pools while retaining source readings and draft status', () => {
    const facets = vocabularyFacetOptions(words.filter(w => vocabularyKind(w) === 'word'), { collection: 'All collections', level: 'All levels', pos: 'All types' });
    expect(facets.levels).toContain('HSK 3.0 · 5');
    const phrases = sentencePhraseEntries(level5);
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every(e => e.hskLevel === 5 && e.contentStatus === 'draft')).toBe(true);
  });
});
