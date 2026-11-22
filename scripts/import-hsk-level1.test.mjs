/** Import boundary tests: bad identity, taxonomy or readings must never reach runtime data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { importLevel1 } from './import-hsk-level1.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sourceRaw = readFileSync('importer/hsk/hsk3_level1_1.7.1.json', 'utf8');
const source = JSON.parse(sourceRaw);
const topics = read('importer/hsk/hsk3_topics.json');
const vocabulary = readVocabulary();

function fixture(t, edit = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk-import-'));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'));
    rmSync(directory, { recursive: true, force: true });
  });
  const inputs = structuredClone({ source, topics, vocabulary });
  edit(inputs);
  const paths = { sourcePath: join(directory, 'hsk3_level1_1.7.1.json'), topicsPath: join(directory, 'topics.json'), vocabularyPath: join(directory, 'vocabulary.json') };
  for (const key of ['source', 'topics', 'vocabulary']) writeFileSync(paths[`${key}Path`], key === 'source' && JSON.stringify(inputs.source) === JSON.stringify(source) ? sourceRaw : JSON.stringify(inputs[key]));
  return paths;
}

test('reimport is idempotent and preserves all records outside Level 1', t => {
  const paths = fixture(t);
  const { data, report } = importLevel1(paths);
  assert.deepEqual(data, vocabulary);
  assert.equal(report.alignedExamples, 600);
  assert.equal(report.preservedWordRecordings, 276);
});

test('replacement removes Level 1 phrases while retaining other-level phrases and recordings', t => {
  const paths = fixture(t, inputs => inputs.vocabulary.entries.push({ ...inputs.vocabulary.entries.find(e => e.hskLevel === 2 && e.entryKind === 'phrase'), id: 'old-level1-phrase', hskLevel: 1 }));
  const { data, report } = importLevel1(paths);
  assert.deepEqual(data.entries, vocabulary.entries);
  assert.equal(report.removedLevel1Phrases, 1);
});

test('rejects headword/ID disagreement even when the number is in range', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].headword = inputs.source.entries[1].headword; inputs.source.entries[1].headword = source.entries[0].headword; });
  assert.throws(() => importLevel1(paths), /ID\/headword mismatch/);
});

test('rejects duplicate source identities', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[1].id = 1; });
  assert.throws(() => importLevel1(paths), /unique IDs/);
});

test('rejects a topics sidecar that differs from the main handoff', t => {
  const paths = fixture(t, inputs => { inputs.topics.topics[0].label = 'Unexpected topic'; });
  assert.throws(() => importLevel1(paths), /Topic sidecar differs/);
});

test('rejects dangling secondary topic IDs', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].topic_ids.push('unknown-topic'); });
  assert.throws(() => importLevel1(paths), /Invalid topic_ids/);
});

test('retains exact parent and subtopic assignments without changing collection identities', t => {
  const { data, report } = importLevel1(fixture(t));
  assert.equal(report.topics.count, 22);
  assert.equal(report.topics.subtopicCount, 25);
  assert.equal(report.assignedPrimarySubtopics, 49);
  for (const recorded of source.entries) {
    const entry = data.entries.find(e => e.hskLevel === 1 && e.hsk_index === recorded.id);
    assert.equal(entry.studyMetadata.taxonomyVersion, topics.version);
    assert.equal(entry.studyMetadata.primarySubtopicId, recorded.primary_subtopic_id);
    assert.deepEqual(entry.studyMetadata.subtopicIds, recorded.subtopic_ids);
    assert.deepEqual(entry.categoryIds.map(id => data.categories.find(c => c.id === id).name),
      recorded.topic_ids.map(id => topics.topics.find(t => t.id === id).label));
  }
});

const invalidSubtopics = [
  ['different embedded subtopics', inputs => { inputs.topics.subtopics[0].label = 'Changed'; }, /Topic sidecar differs/],
  ['unknown subtopics', inputs => { inputs.source.entries[0].subtopic_ids = ['unknown']; }, /Invalid subtopic_ids/],
  ['duplicate subtopics', inputs => {
    const entry = inputs.source.entries.find(e => e.subtopic_ids.length);
    entry.subtopic_ids.push(entry.subtopic_ids[0]);
  }, /Invalid subtopic_ids/],
  ['unrelated subtopic parent', inputs => { inputs.source.entries[0].subtopic_ids = ['animals-wildlife']; }, /Invalid subtopic_ids/],
  ['primary subtopic outside its list', inputs => { inputs.source.entries[0].primary_subtopic_id = 'animals-wildlife'; }, /Invalid primary_subtopic_id/],
  ['secondary parent used as primary subtopic', inputs => {
    const entry = inputs.source.entries[0];
    entry.subtopic_ids = ['emotions-attitudes']; entry.primary_subtopic_id = 'emotions-attitudes';
  }, /Invalid primary_subtopic_id/],
  ['unsupported schema', inputs => { inputs.source.schema_version = 'hsk-example-pairs/9.0.0'; }, /Unsupported handoff schema/],
];
for (const [name, edit, error] of invalidSubtopics) test(`rejects ${name} before writing`, t => {
  const paths = fixture(t, edit), before = readFileSync(paths.vocabularyPath, 'utf8');
  assert.throws(() => importLevel1(paths), error);
  assert.equal(readFileSync(paths.vocabularyPath, 'utf8'), before);
});

test('preserves an approved spacing correction and its exact recording on reimport', t => {
  const paths = fixture(t, inputs => {
    inputs.vocabulary.entries.find(e => e.hsk_index === 36).examples[0].audio = { url: 'corrected-recording' };
  });
  const example = importLevel1(paths).data.entries.find(e => e.hsk_index === 36).examples[0];
  assert.equal(example.pinyinDisplay, 'wǒ zài diànnǎo shàng xuéxí.');
  assert.deepEqual(example.audio, { url: 'corrected-recording' });
});

test('rejects ambiguous or count-mismatched sentence pinyin', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].examples[0].pinyin = 'wǒ.'; });
  assert.throws(() => importLevel1(paths), /Ambiguous or mismatched pinyin/);
});

test('rejects changed headword readings that need an audio review', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].pinyin = 'āi'; });
  assert.throws(() => importLevel1(paths), /existing audio needs review/);
});

test('does not retain sentence audio when the same text has a changed reading', t => {
  const paths = fixture(t, inputs => {
    const example = inputs.vocabulary.entries.find(e => e.hsk_index === 1).examples[0];
    example.pinyinDisplay = 'different reading';
    example.audio = { url: 'old-recording' };
  });
  const { data } = importLevel1(paths);
  assert.equal(data.entries.find(e => e.hsk_index === 1).examples[0].audio, null);
});
