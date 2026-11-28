import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sentencePhraseEntries, vocabularyData } from './data-contract';
import { vocabularyFacetOptions, vocabularyKind, words } from './mandarin';

const raw = readFileSync('importer/hsk/hsk3_level6_1.0.1.json');
const source = JSON.parse(raw.toString());
const level6 = vocabularyData.entries.filter(e => e.hskLevel === 6);

describe('Level 6 imported vocabulary', () => {
  it('loads both compact parts below 9 MB with all current official IDs', () => {
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
    expect(level6.map(e => e.hsk_index).sort((a, b) => a! - b!)).toEqual(source.entries.map((e: { id: number }) => e.id));
  });

  it('retains handoff fields, review statuses and field-level source evidence', () => {
    const hash = createHash('sha256').update(raw).digest('hex');
    for (const entry of level6) {
      const recorded = source.entries.find((row: { id: number }) => row.id === entry.hsk_index);
      expect(entry.simplified).toBe(recorded.headword);
      expect(entry.pinyinDisplay).toBe(recorded.pinyin);
      expect(entry.studyMetadata?.sourceSha256).toBe(hash);
      expect(entry.studyMetadata?.meaningSource).toEqual(recorded.meaning_source);
      expect(entry.studyMetadata?.subtopicIds).toEqual(recorded.subtopic_ids);
      expect(entry.contentStatus).toBe('draft');
      // Word recordings come only from the owner's HSK 6 audio package: an entry either
      // carries its attached CDN recording or stays unrecorded (never TTS-substituted).
      if (entry.audio) {
        expect(entry.audio.recordingKind).toBe('word');
        expect(entry.audio.url).toMatch(/^\/__l5e\/assets-v1\//);
      }
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
    // 1,313 originals + 65 first-round reviews + 13 source/transcription-screened sandhi clips.
    expect(level6.filter(e => e.audio).length).toBe(1391);
    const review = JSON.parse(readFileSync('importer/data/missing-audio/listening-review.json', 'utf8'));
    const clips = JSON.parse(readFileSync('importer/data/missing-audio/manifest.json', 'utf8')).clips;
    const reviewed = review.words.filter((row: { hskLevel: number }) => row.hskLevel === 6);
    expect(reviewed).toHaveLength(65);
    for (const selected of reviewed) {
      const entry = level6.find(e => e.id === selected.entryId);
      if (!entry) throw new Error(`Missing reviewed word ${selected.entryId}`);
      expect(entry.audio?.url).toContain(`missing-${clips[selected.clipId].sha256.slice(0, 16)}`);
      expect(entry.audio?.recordingKind).toBe('word');
    }
    const roundTwo = JSON.parse(readFileSync('importer/data/missing-audio/v2/review.json', 'utf8'));
    const roundTwoClips = JSON.parse(readFileSync('importer/data/missing-audio/v2/manifest.json', 'utf8')).clips;
    const selectedRoundTwo = roundTwo.words.filter((row: { hskLevel: number }) => row.hskLevel === 6);
    expect(selectedRoundTwo).toHaveLength(13);
    for (const selected of selectedRoundTwo) {
      const entry = level6.find(e => e.id === selected.entryId);
      expect(entry?.pinyinDisplay).toBe(selected.pinyinDisplay);
      expect(entry?.audio?.url).toContain(`missing-${roundTwoClips[selected.clipId].sha256.slice(0, 16)}`);
    }
    expect(level6.find(e => e.studyMetadata?.numberingRevision?.previousId === 4491)?.examples[1]?.importNormalization).toContain('U+00AD');
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
