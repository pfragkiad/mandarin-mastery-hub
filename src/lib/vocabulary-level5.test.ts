import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { vocabularyData, sentencePhraseEntries } from './data-contract';
import { vocabularyFacetOptions, vocabularyKind, words } from './mandarin';

const raw = readFileSync('importer/hsk/hsk3_level5_1.0.6.json');
const source = JSON.parse(raw.toString());
const level5 = vocabularyData.entries.filter(e => e.hskLevel === 5);

describe('Level 5 draft terms', () => {
  it('keeps the stored part compact and below the 10 MB file limit', () => {
    const stored = readFileSync('src/data/vocabulary/level-5.json');
    expect(stored.byteLength).toBeLessThan(10_000_000);
    expect(stored.toString().trim().split(/\r?\n/)).toHaveLength(level5.length + 2);
  });
  it('exposes every exact syllabus identity and its recorded draft fields', () => {
    expect(level5).toHaveLength(1600);
    expect(level5.map(e => e.hsk_index).sort((a, b) => a! - b!)).toEqual(source.entries.map((e: { id: number }) => e.id));
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
    }
  });
  it('attaches word audio only to the 1,306 exact word-and-reading matches', () => {
    const manifest = JSON.parse(readFileSync('importer/data/hsk-audio/level5-manifest-1.0.6.json', 'utf-8'));
    const rows = new Map<number, { status: string; recording?: { sha256: string } }>(
      manifest.entries.map((row: { hskIndex: number }) => [row.hskIndex, row]));
    let attached = 0;
    for (const entry of level5) {
      const row = entry.hsk_index === null ? undefined : rows.get(entry.hsk_index);
      if (row?.status !== 'matched') { expect(entry.audio).toBeNull(); continue; }
      attached += 1;
      expect(entry.audio?.source).toBe('audio-cmn / Shtooka (cmn-caen-tan) / Yue Tan');
      expect(entry.audio?.recordingKind).toBe('word');
      expect(entry.audio?.url).toMatch(/^\/__l5e\/assets-v1\//);
      // Reused earlier-level clips keep their own names; new Level 5 uploads are named by the clip's checksum.
      if (entry.audio?.url.includes('/hsk5-')) expect(entry.audio.url).toContain(row.recording!.sha256.slice(0, 16));
    }
    expect(attached).toBe(1306);
    for (const example of level5.flatMap(e => e.examples)) expect(example.audio ?? null).toBeNull();
  });
  it('offers Level 5 word and sentence pools while retaining source readings and draft status', () => {
    const facets = vocabularyFacetOptions(words.filter(w => vocabularyKind(w) === 'word'), { collection: 'All collections', level: 'All levels', pos: 'All types' });
    expect(facets.levels).toContain('HSK 3.0 · 5');
    const phrases = sentencePhraseEntries(level5);
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every(e => e.hskLevel === 5 && e.contentStatus === 'draft')).toBe(true);
  });
});
