/** Import boundary tests: bad identity, taxonomy or readings must never reach runtime data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { importLevel1 } from './import-hsk-level1.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sourceRaw = readFileSync('importer/hsk/hsk3_level1_1.6.0.json', 'utf8');
const source = JSON.parse(sourceRaw);
const topics = read('importer/hsk/hsk3_level1_topics_1.6.0.json');
const vocabulary = read('src/data/vocabulary.json');

function fixture(t, edit = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk-import-'));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'));
    rmSync(directory, { recursive: true, force: true });
  });
  const inputs = structuredClone({ source, topics, vocabulary });
  edit(inputs);
  const paths = { sourcePath: join(directory, 'hsk3_level1_1.6.0.json'), topicsPath: join(directory, 'topics.json'), vocabularyPath: join(directory, 'vocabulary.json') };
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
  const paths = fixture(t, inputs => { inputs.topics[0].label = 'Unexpected topic'; });
  assert.throws(() => importLevel1(paths), /Topic sidecar differs/);
});

test('rejects dangling secondary topic IDs', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].topic_ids.push('unknown-topic'); });
  assert.throws(() => importLevel1(paths), /Invalid topic_ids/);
});

test('rejects ambiguous or count-mismatched sentence pinyin', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].examples[0].pinyin = 'wǒ.'; });
  assert.throws(() => importLevel1(paths), /Ambiguous or mismatched pinyin/);
});

test('rejects changed headword readings that need an audio review', t => {
  const paths = fixture(t, inputs => { inputs.source.entries[0].pinyin = 'āi'; });
  assert.throws(() => importLevel1(paths), /existing audio needs review/);
});
