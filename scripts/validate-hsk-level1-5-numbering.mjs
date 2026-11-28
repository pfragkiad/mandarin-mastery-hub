/** Check current official identities against frozen pre-migration UUID/audio
 * bindings and repeat the real import boundary without writing runtime data.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { importHskLevel } from './import-hsk-level1.mjs';
import { readVocabulary, dumpEntries } from './vocabulary-store.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const builds = read('reports/hsk-level1-5-official-numbering-migration.json').levels;
const baseline = read('importer/data/hsk-level1-5-numbering/legacy-bindings.json').entries;
const missingManifest = read('importer/data/missing-audio/manifest.json');
const listeningReview = read('importer/data/missing-audio/listening-review.json');
const supplemental = [
  ...missingManifest.words.filter(row => row.status === 'matched_exact_reading').map(row => ({
    ...row, clipId: row.candidateClips.find(clip => clip.matchKind === 'exact_headword_and_reading').clipId,
  })),
  ...listeningReview.words.filter(row => row.hskLevel <= 5),
];
const supplementalById = new Map(supplemental.map(row => [row.entryId, row]));
const official = new Map(read('importer/data/hsk-level7/official-vocabulary.json').map(e => [e.id, e]));
const vocabulary = readVocabulary();
let changed = 0, recordings = 0, supplementalRecordings = 0;

for (const build of builds) {
  assert.equal(digest(build.current_source), build.sha256);
  const source = read(build.current_source);
  const entries = vocabulary.entries.filter(e => e.hskLevel === build.level);
  const bindings = baseline.filter(e => e.level === build.level);
  assert.deepEqual(entries.map(e => e.id), bindings.map(e => e.uuid), 'UUID or entry order changed');
  const byLegacy = new Map(source.entries.map(e => [e.legacy_syllabus_id, e]));
  for (const [i, entry] of entries.entries()) {
    const old = bindings[i], handoff = byLegacy.get(old.legacy_id), row = official.get(handoff.id);
    assert.deepEqual([handoff.id, handoff.syllabus_headword, handoff.syllabus_pinyin, handoff.syllabus_pos_zh],
      [row.id, row.entry, row.pinyin, row.part_of_speech]);
    assert.deepEqual([entry.simplified, entry.pinyinDisplay], [old.headword, old.pinyin]);
    const supplement = supplementalById.get(entry.id);
    if (old.audio === null && supplement) {
      // The frozen ledger stays immutable. Only exact source-tagged or explicitly
      // listening-reviewed additions may differ; prior attachments remain byte-identical.
      assert.deepEqual([entry.hskLevel, entry.hsk_index, entry.simplified, entry.pinyinDisplay],
        [supplement.hskLevel, supplement.hskIndex, supplement.simplified, supplement.pinyinDisplay]);
      assert.equal(entry.audio?.recordingKind, 'word');
      assert.match(entry.audio?.url ?? '', /^\/__l5e\/assets-v1\//);
      const clip = missingManifest.clips[supplement.clipId];
      assert.match(entry.audio?.url ?? '', new RegExp(`/missing-${clip.sha256.slice(0, 16)}\\.(mp3|wav)$`));
      supplementalRecordings += 1;
    } else assert.deepEqual(entry.audio, old.audio);
    assert.equal(entry.hsk_index, handoff.id);
    assert.equal(entry.hskSource.sourceId, String(handoff.id));
    assert.equal(entry.hskSource.sourceName, build.current_source.split('/').at(-1));
    assert.equal(entry.studyMetadata.sourceSha256, build.sha256);
    assert.equal(entry.studyMetadata.syllabusPinyin, row.pinyin);
    assert.deepEqual(entry.studyMetadata.numberingRevision, { name: 'official-site-1219', previousId: old.legacy_id });
    changed += entry.hsk_index !== old.legacy_id;
    recordings += Boolean(entry.audio);
  }
  const manifest = read(build.audio_manifest.path);
  assert.equal(digest(build.audio_manifest.path), build.audio_manifest.sha256);
  assert.equal(manifest.entries.length, entries.length);
  const byUuid = new Map(entries.map(e => [e.id, e]));
  for (const row of manifest.entries) {
    const entry = byUuid.get(row.entryId);
    assert.deepEqual([entry.hsk_index, entry.simplified, entry.pinyinDisplay], [row.hskIndex, row.headword, row.reading]);
  }
  const imported = importHskLevel({ level: build.level, sourcePath: build.current_source,
    topicsPath: 'importer/hsk/hsk3_topics.json', vocabularyPath: 'src/data/vocabulary' });
  assert.deepEqual(imported.data, vocabulary, 'Repeat import changed vocabulary');
  const raw = readFileSync(`src/data/vocabulary/level-${build.level}.json`, 'utf8');
  assert.equal(raw, dumpEntries(entries), 'Expected one compact entry per line');
  assert.ok(Buffer.byteLength(raw) < 9_000_000);
}
assert.equal(changed, 1092);
assert.equal(recordings, 3127);
assert.equal(supplementalRecordings, 139);
console.log(JSON.stringify({ entries: 3600, updatedOfficialIds: changed, preservedWordRecordings: recordings - supplementalRecordings,
  sourceExactWordRecordings: 8, listeningReviewedWordRecordings: 131,
  supplementalWordRecordings: supplementalRecordings, totalWordRecordings: recordings,
  preservedUuidsOrderReadingsAndPriorAudio: true, repeatImportsIdempotent: true, compactPartsBelow9MB: true }, null, 2));
