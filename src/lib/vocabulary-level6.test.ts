import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sentencePhraseEntries, vocabularyData } from './data-contract';
import { vocabularyFacetOptions, vocabularyKind, words } from './mandarin';

const raw = readFileSync('importer/hsk/hsk3_level6_1.0.0.json');
const source = JSON.parse(raw.toString());
const level6 = vocabularyData.entries.filter(e => e.hskLevel === 6);

describe('Level 6 imported vocabulary', () => {
  it('loads both compact parts below 9 MB in exact syllabus order', () => {
    const index = JSON.parse(readFileSync('src/data/vocabulary/index.json', 'utf8'));
    const names = index.parts.filter((name: string) => name.startsWith('level-6'));
    expect(names).toEqual(['level-6-part-1.json', 'level-6-part-2.json']);
    for (const name of names) {
      const bytes = readFileSync(`src/data/vocabulary/${name}`);
      expect(bytes.byteLength).toBeLessThan(9_000_000);
      expect(bytes.toString().trim().split(/\r?\n/)).toHaveLength(902);
      expect(JSON.parse(bytes.toString())).toHaveLength(900);
    }
    expect(level6).toHaveLength(1800);
    expect(level6.map(e => e.hsk_index)).toEqual(source.entries.map((e: { id: number }) => e.id));
  });

  it('retains handoff fields, review statuses and field-level source evidence', () => {
    const hash = createHash('sha256').update(raw).digest('hex');
    for (const [i, entry] of level6.entries()) {
      const recorded = source.entries[i];
      expect(entry.simplified).toBe(recorded.headword);
      expect(entry.pinyinDisplay).toBe(recorded.pinyin);
      expect(entry.studyMetadata?.sourceSha256).toBe(hash);
      expect(entry.studyMetadata?.meaningSource).toEqual(recorded.meaning_source);
      expect(entry.studyMetadata?.subtopicIds).toEqual(recorded.subtopic_ids);
      expect(entry.contentStatus).toBe('draft');
      expect(entry.audio).toBeNull();
      for (const [j, ex] of entry.examples.entries()) {
        const original = recorded.examples[j];
        expect(ex.simplified).toBe(original.hanzi.replace(/^\u00ad/, ''));
        expect(ex.pinyinDisplay).toBe(original.pinyin.replace(/^\u00ad /, ''));
        expect(ex.english).toBe(original.english);
        expect(ex.reviewStatus).toBe(original.review_status);
        expect(ex.sourceReference).toEqual(original.source_reference);
        expect(ex.revision).toEqual(original.revision);
        expect(ex.tokens.map(t => t.text).join('')).toBe(ex.simplified);
        expect(ex.audio).toBeNull();
      }
    }
    expect(level6.flatMap(e => e.examples)).toHaveLength(3600);
    expect(level6.find(e => e.hsk_index === 4491)?.examples[1]?.importNormalization).toContain('U+00AD');
  });

  it('offers the new level in word and sentence pools', () => {
    const facets = vocabularyFacetOptions(words.filter(w => vocabularyKind(w) === 'word'), {
      collection: 'All collections', level: 'All levels', pos: 'All types',
    });
    expect(facets.levels).toContain('HSK 3.0 · 6');
    const phrases = sentencePhraseEntries(level6);
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every(e => e.hskLevel === 6 && e.contentStatus === 'draft')).toBe(true);
  });
});
