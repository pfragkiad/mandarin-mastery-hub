/** Audit every active lesson/curriculum and remove historical HSK IDs from app
 * vocabulary. Original citations remain in a frozen offline migration ledger.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { currentHskRuntimeEntry } from './hsk-runtime-references.mjs';
import { readVocabulary, writeVocabulary } from './vocabulary-store.mjs';

const write = process.argv.includes('--write');
assert.ok(write || process.argv.includes('--check'), 'Use --write or --check');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const root = 'src/data/study_lessons/lessons';
const ledgerPath = 'importer/data/hsk-app-reference-history/removed-runtime-metadata.json';
const auditPath = 'reports/hsk-current-app-references.json';
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? files(join(directory, d.name)) : d.name.endsWith('.json') ? [join(directory, d.name)] : []);
const vocabulary = readVocabulary();
const official = new Map(read('importer/data/hsk-level7/official-vocabulary.json').map(e => [e.id, e]));
const words = vocabulary.entries.filter(e => e.hskVersion === '3.0' && e.hsk_index != null);
assert.equal(words.length, 5400);
const byId = new Map(words.map(e => [e.hsk_index, e]));
const byUuid = new Map(words.map(e => [e.id, e]));
const lessons = new Map();
let references = 0, placements = 0, neutralRecordings = 0;
const walk = (value, visit) => {
  if (Array.isArray(value)) value.forEach(v => walk(v, visit));
  else if (value && typeof value === 'object') { visit(value); Object.values(value).forEach(v => walk(v, visit)); }
};
for (const path of files(root)) {
  if (path.split(/[\\/]/).includes('legacy') || !/[/\\][^/\\]*_LESSON_[^/\\]*[/\\]/.test(path)) continue;
  const doc = read(path);
  assert.ok(!lessons.has(doc.lesson_id), `Duplicate lesson ${doc.lesson_id}`);
  lessons.set(doc.lesson_id, doc);
  walk(doc, object => {
    for (const ref of object.syllabus_refs ?? []) {
      assert.equal(ref.curriculum_id, 'hsk3-2025');
      const word = byId.get(ref.entry_id);
      assert.ok(word, `${path}: unknown official ID ${ref.entry_id}`);
      assert.equal(word.simplified, object.hanzi, `${path}: current ID/headword mismatch ${ref.entry_id}`);
      assert.equal(word.pinyinDisplay, object.pinyin, `${path}: recorded reading differs`);
      assert.equal(word.studyMetadata.primaryPosId, object.primary_pos_id, `${path}: recorded POS differs`);
      assert.equal(word.meanings.join('; '), object.meaning_en, `${path}: copied meaning differs`);
      if (object.examples) assert.deepEqual(object.examples.map(ex => [ex.hanzi, ex.pinyin, ex.english, ex.style, ex.register]),
        word.examples.map(ex => [ex.simplified, ex.pinyinDisplay, ex.english, ex.style, ex.register]), `${path}: copied examples differ`);
      references++;
    }
    if (object.hsk_syllabus_id != null) {
      assert.equal(byId.get(object.hsk_syllabus_id)?.simplified, object.hanzi, path);
    }
  });
}
const lessonIds = (doc, curriculum, role) => (doc.sections?.vocabulary?.items ?? []).flatMap(item =>
  role && item.learning_role !== role ? [] : (item.syllabus_refs ?? []).filter(r => r.curriculum_id === curriculum).map(r => r.entry_id));
for (const path of files(`${root}/curricula`)) {
  const course = read(path);
  for (const section of course.sections) for (const unit of section.units) for (const placement of unit.placements) {
    const lesson = lessons.get(placement.lesson_id);
    assert.ok(lesson, `Unresolved lesson ${placement.lesson_id}`);
    for (const role of ['introduced', 'reviewed']) {
      const actual = placement[`${role}_syllabus_entry_ids`];
      const expected = lessonIds(lesson, course.curriculum_id, role);
      assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), [...new Set(expected)].sort((a, b) => a - b),
        `${placement.lesson_id}: ${role} IDs differ from exact current lesson references`);
    }
    placements++;
  }
}
const manifestPath = `${root}/manifest.json`, manifest = read(manifestPath);
let manifestRows = 0;
for (const row of manifest.lessons) if (row.entry_ids) {
  const lesson = lessons.get(row.lesson_id);
  assert.ok(lesson, `Manifest references missing lesson ${row.lesson_id}`);
  const current = lessonIds(lesson, manifest.curriculum_id);
  if (write) row.entry_ids = current;
  assert.deepEqual(row.entry_ids, current, `${row.lesson_id}: stale manifest IDs`);
  manifestRows++;
}
for (const recording of Object.values(read('src/data/pinyin/neutral-audio.json').recordings)) {
  if (recording.hskIndex == null) continue;
  const word = byUuid.get(recording.entryId);
  assert.ok(word, `Missing neutral recording word ${recording.entryId}`);
  assert.deepEqual([recording.hskIndex, recording.word, recording.reading], [word.hsk_index, word.simplified, word.pinyinDisplay]);
  neutralRecordings++;
}

const cleaned = { ...vocabulary, entries: vocabulary.entries.map(currentHskRuntimeEntry) };
if (write && !existsSync(ledgerPath)) {
  const records = words.map(entry => ({ id: entry.id, hsk_index: entry.hsk_index,
    numberingRevision: entry.studyMetadata?.numberingRevision,
    secondarySources: entry.secondarySources,
    examples: entry.examples.flatMap(ex => {
      const next = cleaned.entries.find(e => e.id === entry.id).examples.find(e => e.id === ex.id);
      return digest(ex) === digest(next) ? [] : [{ id: ex.id, sourceReference: ex.sourceReference, revision: ex.revision }];
    }),
  }));
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, `{"schema_version":"hsk-offline-runtime-reference-history/1.0.0","records":[\n${records.map(r => JSON.stringify(r)).join(',\n')}\n]}\n`);
}
for (const entry of cleaned.entries) {
  if (entry.hsk_index == null || entry.hskVersion !== '3.0') continue;
  assert.deepEqual([entry.simplified, entry.studyMetadata.syllabusHeadword], [official.get(entry.hsk_index).hanzi, official.get(entry.hsk_index).entry]);
  for (const ref of [entry.hskSource, entry.partOfSpeechSource, entry.studyMetadata.source, ...entry.secondarySources, ...entry.examples.map(ex => ex.source)]) {
    assert.equal(ref.sourceId, String(entry.hsk_index), `Non-current source ID on ${entry.id}`);
  }
  assert.equal(entry.sourceId, String(entry.hsk_index));
  walk(entry, object => {
    for (const key of ['numberingRevision', 'previousId', 'previous_id', 'legacy_syllabus_id', 'baseline_id'])
      assert.ok(!(key in object), `Historical HSK field remains: ${entry.id}/${key}`);
    if (typeof object.handoff === 'string' && /^hsk3_level/.test(object.handoff)) assert.ok(!('entry_id' in object));
  });
}
if (write) {
  writeVocabulary('src/data/vocabulary', cleaned);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} else assert.deepEqual(vocabulary, cleaned, 'Historical IDs remain in raw app data');
const report = { schema_version: 'hsk-current-app-references/1.0.0',
  vocabulary_entries: words.length, lessons: lessons.size, lesson_word_references: references,
  lesson_readings_and_pos_match: true,
  lesson_meanings_and_examples_match: true,
  curriculum_placements: placements, manifest_lessons: manifestRows, neutral_audio_bindings: neutralRecordings,
  current_official_identities_only: true, historical_hsk_fields_in_app: 0,
  lesson_compatibility_mapping: false, uuids_examples_readings_and_audio_preserved: true,
  offline_history: ledgerPath,
};
if (write) writeFileSync(auditPath, `${JSON.stringify(report, null, 2)}\n`);
else assert.deepEqual(read(auditPath), report);
console.log(JSON.stringify(report, null, 2));
