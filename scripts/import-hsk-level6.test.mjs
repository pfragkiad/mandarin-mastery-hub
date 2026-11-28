/** Level 6 import: source evidence, exact identities, repeat imports and size limits. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLevel6 } from './import-hsk-level6.mjs';
import { readVocabulary, writeVocabulary } from './vocabulary-store.mjs';

const sourcePath = 'importer/hsk/hsk3_level6_1.0.0.json';
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const vocabulary = readVocabulary();
function fixture(t, edit = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk6-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = structuredClone(vocabulary);
  edit(data);
  const vocabularyPath = join(directory, 'vocabulary.json');
  writeFileSync(vocabularyPath, JSON.stringify(data));
  return { sourcePath, topicsPath: 'importer/hsk/hsk3_topics.json', vocabularyPath };
}

test('imports all 1800 identities and 3600 examples with credits and revision evidence', t => {
  const paths = fixture(t, data => { data.entries = data.entries.filter(e => e.hskLevel !== 6); });
  const before = readVocabulary(paths.vocabularyPath);
  const { data, report } = importLevel6(paths);
  assert.deepEqual(data.entries.filter(e => e.hskLevel !== 6), before.entries);
  assert.deepEqual(data.categories, before.categories);
  assert.equal(report.alignedHeadwords, 1800);
  assert.equal(report.alignedExamples, 3600);
  const entries = data.entries.filter(e => e.hskLevel === 6);
  assert.deepEqual(entries.map(e => e.hsk_index), source.entries.map(e => e.id));
  for (const [i, entry] of entries.entries()) {
    const recorded = source.entries[i];
    assert.equal(entry.simplified, recorded.headword);
    assert.equal(entry.pinyinDisplay, recorded.pinyin);
    assert.deepEqual(entry.meanings, recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
    assert.deepEqual(entry.studyMetadata.meaningSource, recorded.meaning_source);
    assert.deepEqual(entry.studyMetadata.subtopicIds, recorded.subtopic_ids);
    assert.equal(entry.contentStatus, 'draft');
    for (const [j, ex] of entry.examples.entries()) {
      const original = recorded.examples[j];
      assert.equal(ex.simplified, original.hanzi.replace(/^\u00ad/, ''));
      assert.equal(ex.pinyinDisplay, original.pinyin.replace(/^\u00ad /, ''));
      assert.equal(ex.english, original.english);
      assert.equal(ex.reviewStatus, original.review_status);
      assert.equal(ex.provenance, original.provenance);
      assert.deepEqual(ex.sourceReference, original.source_reference);
      assert.deepEqual(ex.revision, original.revision);
      assert.equal(ex.tokens.map(t => t.text).join(''), ex.simplified);
      assert.equal(ex.audio, null);
    }
  }
  const literalSlash = entries.find(e => e.hsk_index === 5257).examples[0];
  assert.equal(literalSlash.tokens.find(t => t.text === '/').kind, 'punctuation');
  assert.equal(literalSlash.tokens.find(t => t.text === '/').pinyin, null);
  assert.equal(report.output.parts.length, 2);
  assert.ok(report.output.parts.every(p => p.bytes < 9_000_000 && p.entries === 900));
  assert.deepEqual(report.exampleNormalizations.map(p => p.entryId), [4491]);

  // Repeating the import preserves IDs, timestamps and compatible recordings.
  entries[0].audio = { url: 'https://example.test/word.mp3' };
  entries[0].examples[0].audio = { url: 'https://example.test/sentence.mp3' };
  writeFileSync(paths.vocabularyPath, JSON.stringify(data));
  assert.deepEqual(importLevel6(paths).data, data);
  const directory = join(paths.vocabularyPath, '..', 'split');
  writeVocabulary(directory, data);
  assert.deepEqual(readVocabulary(directory), data);
});

test('rejects partial imports and mismatched recorded headwords', t => {
  const complete = importLevel6(fixture(t, data => { data.entries = data.entries.filter(e => e.hskLevel !== 6); })).data;
  const paths = fixture(t);
  const partial = structuredClone(complete);
  partial.entries = partial.entries.filter(e => e.hsk_index !== 3601);
  writeFileSync(paths.vocabularyPath, JSON.stringify(partial));
  assert.throws(() => importLevel6(paths), /complete and unique/);
  complete.entries.find(e => e.hsk_index === 3601).simplified = 'wrong';
  writeFileSync(paths.vocabularyPath, JSON.stringify(complete));
  assert.throws(() => importLevel6(paths), /ID\/headword mismatch/);
});
