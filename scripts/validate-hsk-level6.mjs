#!/usr/bin/env node
/** Validate either offline Level 6 handoff against its pinned transcription.
 * Checks identities, example structure, shared taxonomy and pinyin alignment;
 * these checks do not certify language quality or contextual pronunciation.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createJiti } from 'jiti';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const sourceBytes = readFileSync(resolve(root, 'importer/data/hsk-level6/syllabus-2025-11.json'));
const source = JSON.parse(sourceBytes);
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--source'), 'Usage: node scripts/validate-hsk-level6.mjs [--source path]');
const handoffPath = args[1] ?? 'importer/hsk/hsk3_level6_1.0.1.json';
const handoff = read(handoffPath);
if (handoff.data_version === '1.0.1') {
  const { validateCurrentLevel6 } = await import('./validate-hsk-level6-current.mjs');
  validateCurrentLevel6(resolve(root, handoffPath));
  process.exit(0);
}
assert.ok(['0.1.0', '1.0.0'].includes(handoff.data_version), 'Unsupported Level 6 handoff version');
const isRelease = handoff.data_version === '1.0.0';
const topics = read('importer/hsk/hsk3_topics.json');
const inventory = new Set(read('src/data/pinyin/inventory.json').syllables.map(s => s.base));
const jiti = createJiti(import.meta.url, { fsCache: false });
const { alignPhrasePinyin } = await jiti.import(resolve(root, 'src/lib/phrase-pinyin-align.ts'));
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), handoff.verification.transcription_json_sha256);
assert.equal(createHash('sha1').update(`blob ${sourceBytes.length}\0`).update(sourceBytes).digest('hex'), handoff.verification.transcription_json_git_blob_sha);
assert.equal(handoff.schema_version, 'hsk-example-pairs/1.3.0');
assert.equal(handoff.syllabus.level, 6);
assert.equal(handoff.syllabus.edition, '2025-11');
assert.equal(handoff.entries.length, 1800);
assert.equal(handoff.syllabus.entry_count, 1800);
assert.equal(handoff.syllabus.official_level_entry_count, 1800);
assert.equal(handoff.syllabus.cumulative_entry_count, 5400);
assert.deepEqual(handoff.syllabus.id_range, [3601, 5400]);
assert.deepEqual(handoff.syllabus.official_level_id_range, [3601, 5400]);
assert.equal(new Set(handoff.entries.map(e => e.id)).size, 1800);
assert.deepEqual(handoff.taxonomy.topics, topics.topics);
assert.deepEqual(handoff.taxonomy.subtopics, topics.subtopics);
assert.equal(handoff.taxonomy.version, topics.version);
const topicIds = new Set(topics.topics.map(t => t.id));
const subtopics = new Map(topics.subtopics.map(t => [t.id, t.parent_topic_id]));
const posIds = new Set(handoff.taxonomy.parts_of_speech.map(t => t.id));
const failures = [];
const counts = {};
const sourceHashes = new Map();
const sourceEntries = new Map();
function hashSource(relativePath) {
  if (!sourceHashes.has(relativePath)) {
    const bytes = readFileSync(resolve(root, 'importer/hsk', relativePath));
    sourceHashes.set(relativePath, createHash('sha256').update(bytes).digest('hex'));
  }
  return sourceHashes.get(relativePath);
}
const dictionaryBytes = readFileSync(resolve(root, 'importer/data/character-readings/cedict_1_0_ts_utf-8_mdbg.txt.gz'));
const dictionaryLines = new Set(gunzipSync(dictionaryBytes).toString('utf8').split(/\r?\n/));
const dictionaryHash = createHash('sha256').update(dictionaryBytes).digest('hex');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const sorted = value => Array.isArray(value) ? value.map(sorted)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const canonicalHash = value => hash(JSON.stringify(sorted(value)));
let baseline;
let manifest;
let replacementMap;
let correctionMap;
if (isRelease) {
  const manifestBytes = readFileSync(resolve(root, 'importer/data/hsk-level6/release-1.0.0-revisions.json'));
  assert.equal(hash(manifestBytes), handoff.verification.revision_manifest.sha256);
  manifest = JSON.parse(manifestBytes);
  const baselineBytes = readFileSync(resolve(root, manifest.baseline.path));
  assert.equal(hash(baselineBytes), manifest.baseline.sha256);
  assert.equal(hash(baselineBytes), handoff.verification.baseline.sha256);
  baseline = JSON.parse(baselineBytes);
  assert.deepEqual(handoff.taxonomy, baseline.taxonomy);
  for (const source of [...manifest.review_sources, ...manifest.new_rewrite_reading_sources]) {
    assert.equal(hash(readFileSync(resolve(root, source.path))), source.sha256, `Source checksum ${source.path}`);
  }
  replacementMap = new Map(manifest.example_replacements.map(p => [`${p.entry_id}/${p.style}`, p]));
  correctionMap = new Map(manifest.targeted_pinyin_corrections.map(p => [`${p.entry_id}/${p.style}`, p]));
  assert.equal(replacementMap.size, 704);
  assert.equal(correctionMap.size, 17);
  const rows = readFileSync(resolve(root, 'reports/hsk-level6-0.1.0-sentence-review.tsv'), 'utf8').trimEnd().split(/\r?\n/).slice(1);
  let flagged = 0;
  for (const line of rows) {
    const fields = line.split('\t');
    assert.equal(fields.length, 14, 'Unexpected baseline review columns');
    if (fields[11] !== 'pass_candidate') {
      assert.ok(replacementMap.has(`${fields[0]}/${fields[4]}`), `Unchanged flagged example ${fields[0]}/${fields[4]}`);
      flagged++;
    }
  }
  assert.equal(flagged, 693);
  assert.equal(new Set(handoff.entries.flatMap(e => e.examples.map(x => x.hanzi))).size, 3600, 'Duplicate sentence text');
}
const alignment = p => p.replaceAll('-', ' ').replace(/(\p{L})\s+r(?=[\s\p{P}]|$)/gu, '$1r');
function checkReading(text, pinyin, context) {
  if (!alignPhrasePinyin(text, alignment(pinyin), inventory)) failures.push(`${context}: ${text} / ${pinyin}`);
}
for (const [index, e] of handoff.entries.entries()) {
  const row = source[index];
  assert.deepEqual([e.id, e.headword, e.pinyin, e.syllabus_headword, e.syllabus_pos_zh],
    [row.id, row.hanzi, row.pinyin, row.entry, row.part_of_speech], `Syllabus tuple ${e.id}`);
  assert.equal(e.id, 3601 + index);
  if (isRelease) {
    const withoutExamples = ({ examples: _examples, ...fields }) => fields;
    assert.deepEqual(withoutExamples(e), withoutExamples(baseline.entries[index]), `Changed lexical fields ${e.id}`);
  }
  assert.ok(e.meaning_en.trim());
  if (index >= 100) {
    assert.equal(e.meaning_source.source_sha256, dictionaryHash);
    assert.ok(dictionaryLines.has(e.meaning_source.source_entry), `Dictionary evidence ${e.id}`);
    assert.equal(e.meaning_source.license, 'CC BY-SA 4.0');
    assert.equal(e.classification_status, 'editorial_draft_needs_review');
  }
  assert.ok(topicIds.has(e.primary_topic_id));
  assert.equal(e.topic_ids[0], e.primary_topic_id);
  assert.equal(new Set(e.topic_ids).size, e.topic_ids.length);
  assert.ok(e.topic_ids.every(id => topicIds.has(id)));
  assert.ok(e.pos_ids.includes(e.primary_pos_id));
  assert.equal(new Set(e.pos_ids).size, e.pos_ids.length);
  assert.ok(e.pos_ids.every(id => posIds.has(id)));
  assert.equal(new Set(e.subtopic_ids).size, e.subtopic_ids.length);
  assert.ok(e.subtopic_ids.every(id => e.topic_ids.includes(subtopics.get(id))));
  assert.ok(e.primary_subtopic_id === null || (e.subtopic_ids[0] === e.primary_subtopic_id && subtopics.get(e.primary_subtopic_id) === e.primary_topic_id));
  assert.equal(e.examples.length, 2);
  assert.deepEqual(e.examples.map(x => [x.style, x.register]), [['conversational', 'neutral_spoken'], ['written', 'plain_written']]);
  assert.notEqual(e.examples[0].hanzi, e.examples[1].hanzi);
  checkReading(e.headword, e.pinyin, `${e.id}/headword`);
  for (const ex of e.examples) {
    assert.ok(ex.hanzi.includes(e.headword), `${e.id}/${ex.style}: missing target`);
    assert.ok(ex.english.trim() && ex.pinyin.trim() && ex.note.trim());
    assert.ok(ex.review_status && ex.provenance && ex.linguistic_source);
    if (isRelease) {
      const key = `${e.id}/${ex.style}`;
      const patch = replacementMap.get(key);
      const correction = correctionMap.get(key);
      const previous = baseline.entries[index].examples.find(x => x.style === ex.style);
      if (patch || correction) {
        const change = patch ?? correction;
        assert.equal(canonicalHash(previous), change.expected_example_sha256, `Revision baseline ${key}`);
        assert.equal(ex.revision.baseline_example_sha256, change.expected_example_sha256);
        assert.equal(ex.revision.version, '1.0.0');
        assert.deepEqual(ex.revision.evidence, change.evidence);
        if (patch) {
          for (const field of ['hanzi', 'pinyin', 'english']) assert.equal(ex[field], patch.replacement[field], `${key}/${field}`);
          assert.equal(ex.review_status, patch.review_status);
          assert.equal(ex.provenance, 'newly_authored');
          assert.equal(ex.linguistic_source, 'editorial_enrichment');
          assert.equal(ex.source_reference, undefined, `Inherited corpus identity ${key}`);
          assert.equal(ex.audio, undefined, `Inherited audio ${key}`);
          assert.notEqual(ex.hanzi, previous.hanzi);
          assert.ok(ex.hanzi.length <= (ex.style === 'written' ? 20 : 16));
          if (patch.review_status === 'new_editorial_rewrite_needs_language_review' && ex.style === 'written') assert.ok(ex.hanzi.length >= 10);
        } else {
          assert.equal(ex.pinyin, correction.pinyin);
          const core = ({ pinyin: _pinyin, note: _note, review_status: _status, revision: _revision, ...fields }) => fields;
          assert.deepEqual(core(ex), core(previous), `Pinyin correction changed other content ${key}`);
        }
      } else assert.deepEqual(ex, previous, `Unplanned example change ${key}`);
    }
    if (ex.linguistic_source === 'tatoeba') {
      for (const language of ['chinese', 'english']) {
        assert.ok(Number.isInteger(ex.source_reference[language].id));
        assert.ok(ex.source_reference[language].author);
      }
      assert.equal(ex.source_reference.license, 'CC BY 2.0 FR');
    } else if (ex.linguistic_source === 'existing_hsk_handoff') {
      const ref = ex.source_reference;
      assert.equal(hashSource(ref.handoff), ref.sha256, `Source checksum ${e.id}`);
      if (!sourceEntries.has(ref.handoff)) sourceEntries.set(ref.handoff,
        new Map(read(`importer/hsk/${ref.handoff}`).entries.map(entry => [entry.id, entry])));
      const recorded = sourceEntries.get(ref.handoff).get(ref.entry_id).examples.find(x => x.style === ref.style);
      assert.deepEqual([ex.hanzi, ex.english], [recorded.hanzi, recorded.english], `Source text ${e.id}/${ex.style}`);
    }
    if (index >= 100) counts[ex.provenance] = (counts[ex.provenance] ?? 0) + 1;
    checkReading(ex.hanzi, ex.pinyin, `${e.id}/${ex.style}`);
  }
}
if (!isRelease) {
  const original = createHash('sha256').update(JSON.stringify(handoff.entries.slice(0, 100))).digest('hex');
  assert.equal(original, handoff.verification.original_100_entry_sha256, 'Original 100 entries changed');
  assert.deepEqual(handoff.verification.added_example_counts, {
    newly_authored: counts.newly_authored,
    existing_hsk_handoff: counts.reused_editorial_example,
    tatoeba: counts.selected_corpus_example,
  });
} else {
  const allCounts = {};
  for (const e of handoff.entries) for (const ex of e.examples) allCounts[ex.provenance] = (allCounts[ex.provenance] ?? 0) + 1;
  assert.deepEqual(handoff.verification.example_provenance_counts, allCounts);
}
if (failures.length) {
  console.error(`${failures.length} readings failed structural alignment:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ version: handoff.data_version, entries: 1800, ids: [3601, 5400], examples: 3600, alignedReadings: 5400,
    ...(isRelease ? { lexicalFieldsPreserved: true, replacedExamples: replacementMap.size, pinyinOnlyCorrections: correctionMap.size, baselineFlaggedExamplesReplaced: 693, duplicateSentenceTexts: 0 }
      : { original100Preserved: true, addedExamples: counts }) }, null, 2));
}
