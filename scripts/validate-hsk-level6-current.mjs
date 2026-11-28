/** Validate 1.0.1 against the exact official PDF extraction and preserved baseline.
 * The historical 1.0.0 checker remains separate because its serial order differs.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { importLevel6 } from './import-hsk-level6.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

export function validateCurrentLevel6(sourcePath) {
  const bytes = readFileSync(sourcePath), source = JSON.parse(bytes);
  const digest = raw => createHash('sha256').update(raw).digest('hex');
  const baselineRaw = readFileSync('importer/hsk/hsk3_level6_1.0.0.json');
  assert.equal(digest(baselineRaw), source.verification.numbering_revision.baseline.sha256);
  const previous = new Map(JSON.parse(baselineRaw).entries.map(e => [e.id, e]));
  const official = JSON.parse(readFileSync('importer/data/hsk-level7/official-vocabulary.json', 'utf8')).filter(e => e.level === '6');
  assert.equal(source.data_version, '1.0.1');
  assert.equal(source.entries.length, 1800);
  for (const [i, e] of source.entries.entries()) {
    const row = official[i];
    assert.deepEqual([e.id, e.syllabus_headword, e.pinyin, e.syllabus_pos_zh], [row.id, row.entry, row.pinyin, row.part_of_speech]);
    const { id, legacy_syllabus_id, official_source_pdf_page, ...fields } = e;
    const { id: oldId, ...oldFields } = previous.get(legacy_syllabus_id);
    assert.deepEqual(fields, oldFields);
    assert.equal(official_source_pdf_page, row.source_pdf_page);
  }
  assert.equal(source.entries.filter(e => e.id !== e.legacy_syllabus_id).length, 850);
  const { data, report } = importLevel6({ sourcePath, topicsPath: 'importer/hsk/hsk3_topics.json', vocabularyPath: 'src/data/vocabulary' });
  assert.deepEqual(data, readVocabulary(), 'Current vocabulary differs from a repeat import');
  const audio = JSON.parse(readFileSync('importer/data/hsk-audio/level6-manifest-1.0.1.json', 'utf8'));
  assert.equal(audio.handoff.sha256, digest(bytes));
  const entries = new Map(data.entries.filter(e => e.hskLevel === 6).map(e => [e.id, e]));
  const review = JSON.parse(readFileSync('importer/data/missing-audio/listening-review.json', 'utf8'));
  const roundTwo = JSON.parse(readFileSync('importer/data/missing-audio/v2/review.json', 'utf8'));
  const roundTwoClips = JSON.parse(readFileSync('importer/data/missing-audio/v2/manifest.json', 'utf8')).clips;
  const reviewed = new Map([...review.words, ...roundTwo.words].filter(e => e.hskLevel === 6).map(e => [e.entryId, e]));
  const missingManifest = JSON.parse(readFileSync('importer/data/missing-audio/manifest.json', 'utf8'));
  for (const row of audio.entries) {
    const e = entries.get(row.entryId), supplement = reviewed.get(row.entryId);
    assert.deepEqual([e.hsk_index, e.simplified, e.pinyinDisplay], [row.hskIndex, row.headword, row.reading]);
    assert.equal(Boolean(e.audio), row.status === 'matched' || Boolean(supplement));
    if (supplement) {
      const clip = missingManifest.clips[supplement.clipId] ?? roundTwoClips[supplement.clipId];
      assert.match(e.audio.url, new RegExp(`/missing-${clip.sha256.slice(0, 16)}\\.(mp3|wav)$`));
      assert.equal(e.audio.recordingKind, 'word');
    }
  }
  assert.equal(reviewed.size, 78);
  assert.equal([...entries.values()].filter(e => e.audio).length, 1391);
  console.log(JSON.stringify({ version: '1.0.1', entries: 1800, updatedOfficialIds: 850,
    preservedExampleIds: report.preservedExampleIds, wordRecordings: report.preservedWordRecordings, listeningReviewedWordRecordings: 65,
    sourceTranscriptionScreenedSandhiWordRecordings: 13, totalWordRecordings: 1391,
    alignedReadings: report.alignedHeadwords + report.alignedExamples, repeatImportIdempotent: true }, null, 2));
}
