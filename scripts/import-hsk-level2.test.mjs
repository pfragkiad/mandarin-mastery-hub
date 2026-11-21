/** Level 2 import boundaries: exact identities, complete replacement and shared taxonomy. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { importLevel2 } from './import-hsk-level2.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sourceRaw = readFileSync('importer/hsk/hsk3_level2_1.0.3.json', 'utf8');
const source = JSON.parse(sourceRaw), topics = read('importer/hsk/hsk3_topics.json');
const vocabulary = readVocabulary();

function fixture(t, edit = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk2-import-'));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'));
    rmSync(directory, { recursive: true, force: true });
  });
  const inputs = structuredClone({ source, topics, vocabulary });
  edit(inputs);
  const paths = { sourcePath: join(directory, 'hsk3_level2_1.0.3.json'), topicsPath: join(directory, 'topics.json'), vocabularyPath: join(directory, 'vocabulary.json') };
  for (const key of ['source', 'topics', 'vocabulary']) writeFileSync(paths[`${key}Path`], key === 'source' && JSON.stringify(inputs.source) === JSON.stringify(source) ? sourceRaw : JSON.stringify(inputs[key]));
  return paths;
}

test('reimport is idempotent, shares category IDs and preserves every record outside Level 2', t => {
  const { data, report } = importLevel2(fixture(t));
  assert.deepEqual(data, vocabulary);
  assert.equal(report.replacedEntries, 200);
  assert.equal(report.replacedWords, 196);
  assert.equal(report.replacedPhrases, 4);
  assert.equal(report.alignedExamples, 400);
  assert.equal(report.removedLegacyExamples, 0);
  assert.equal(report.preservedExampleIds, 400);
});

test('replaces every legacy example even with matching text, preserving entry kinds, IDs, audio and provenance', t => {
  const audio = vocabulary.entries.find(e => e.audio).audio;
  const paths = fixture(t, inputs => {
    for (const entry of inputs.vocabulary.entries.filter(e => e.hskLevel === 2)) {
      entry.audio = audio;
      entry.examples = [{ id: `legacy-${entry.id}`, simplified: source.entries.find(e => e.id === entry.hsk_index).examples[0].hanzi, audio }];
    }
  });
  const { data, report } = importLevel2(paths);
  assert.deepEqual(data.entries.filter(e => e.hskLevel !== 2), vocabulary.entries.filter(e => e.hskLevel !== 2));
  assert.deepEqual(data.categories, vocabulary.categories);
  assert.equal(report.removedLegacyExamples, 200);
  assert.equal(report.preservedExampleIds, 0);
  for (const entry of data.entries.filter(e => e.hskLevel === 2)) {
    const original = vocabulary.entries.find(e => e.id === entry.id);
    for (const key of ['entryKind', 'hsk_index', 'hskSource', 'sourceId', 'sourceName', 'sourceVersion', 'createdAt']) assert.deepEqual(entry[key], original[key]);
    assert.deepEqual(entry.audio, audio);
    assert.equal(entry.examples.length, 2);
    assert.ok(entry.examples.every(ex => !ex.id.startsWith('legacy-') && ex.audio === null));
    assert.ok(entry.secondarySources.some(s => s.sourceName === 'HSK3_Level2_200_Official_IDs_POS_Examples_Classified.xlsx'));
  }
});

const invalid = [
  ['ID/headword disagreement', inputs => { [inputs.source.entries[0].headword, inputs.source.entries[1].headword] = [inputs.source.entries[1].headword, inputs.source.entries[0].headword]; }, /ID\/headword mismatch/],
  ['duplicate source IDs', inputs => { inputs.source.entries[1].id = 301; }, /unique IDs/],
  ['incomplete existing identities', inputs => { inputs.vocabulary.entries = inputs.vocabulary.entries.filter(e => e.hsk_index !== 313); }, /complete and unique/],
  ['different shared topics', inputs => { inputs.topics[0].label = 'Changed'; }, /Topic sidecar differs/],
  ['unknown secondary topics', inputs => { inputs.source.entries[0].topic_ids.push('unknown'); }, /Invalid topic_ids/],
  ['unknown POS', inputs => { inputs.source.entries[0].pos_ids.push('unknown'); }, /Invalid pos_ids/],
  ['missing written style', inputs => { inputs.source.entries[0].examples[1].style = 'conversational'; }, /two ordered example styles/],
  ['mismatched pinyin', inputs => { inputs.source.entries[0].examples[0].pinyin = 'a'; }, /Ambiguous or mismatched pinyin/],
  ['changed lexical reading', inputs => { inputs.source.entries[0].pinyin = 'ā'; }, /existing audio needs review/],
];
for (const [name, edit, error] of invalid) test(`rejects ${name} without changing vocabulary`, t => {
  const paths = fixture(t, edit), before = readFileSync(paths.vocabularyPath, 'utf8');
  assert.throws(() => importLevel2(paths), error);
  assert.equal(readFileSync(paths.vocabularyPath, 'utf8'), before);
});
