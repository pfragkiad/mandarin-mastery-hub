/** Level 5 draft terms/examples: exact identities, recorded readings, safe repeat imports. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLevel5 } from './import-hsk-level5.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

const sourcePath = 'importer/hsk/hsk3_level5_1.0.7.json';
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const vocabulary = readVocabulary();

function fixture(t, edit = () => {}, editSource) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk5-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = structuredClone(vocabulary);
  edit(data);
  const vocabularyPath = join(directory, 'vocabulary.json');
  writeFileSync(vocabularyPath, JSON.stringify(data));
  let inputPath = sourcePath;
  if (editSource) {
    const next = structuredClone(source); editSource(next);
    inputPath = join(directory, 'hsk3_level5_1.0.7.json');
    writeFileSync(inputPath, JSON.stringify(next));
  }
  if (editSource) {
    const pin = createHash('sha256').update(readFileSync(inputPath)).digest('hex');
    for (const e of data.entries.filter(e => e.hskLevel === 5)) e.studyMetadata.sourceSha256 = pin;
    writeFileSync(vocabularyPath, JSON.stringify(data));
  }
  return { sourcePath: inputPath, topicsPath: 'importer/hsk/hsk3_topics.json', vocabularyPath };
}

test('imports all 1600 exact terms and 3200 rewritten examples with draft provenance', t => {
  const paths = fixture(t, data => { data.entries = data.entries.filter(e => e.hskLevel !== 5); });
  const before = readVocabulary(paths.vocabularyPath);
  const { data, report } = importLevel5(paths);
  assert.deepEqual(data.entries.filter(e => e.hskLevel !== 5), before.entries);
  assert.deepEqual(data.categories, before.categories);
  assert.equal(report.alignedHeadwords, 1600);
  assert.equal(report.alignedExamples, 3200);
  const entries = data.entries.filter(e => e.hskLevel === 5);
  assert.equal(entries.length, 1600);
  for (const recorded of source.entries) {
    const entry = entries.find(e => e.hsk_index === recorded.id);
    assert.equal(entry.id, vocabulary.entries.find(e => e.hskLevel === 5 && e.hsk_index === recorded.id).id);
    assert.equal(entry.simplified, recorded.headword);
    assert.equal(entry.pinyinDisplay, recorded.pinyin);
    assert.deepEqual(entry.meanings, recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
    assert.deepEqual(entry.examples.map(ex => [ex.simplified, ex.pinyinDisplay, ex.english, ex.notes, ex.register, ex.reviewStatus]),
      recorded.examples.map(ex => [ex.hanzi, ex.pinyin, ex.english, ex.note, ex.register, ex.review_status]));
    assert.ok(entry.examples.every(ex => ex.tokens.map(t => t.text).join('') === ex.simplified && ex.audio === null));
    assert.equal(entry.audio, null);
    assert.equal(entry.contentStatus, 'draft');
    assert.equal(entry.studyMetadata.verificationStatus, source.verification.status);
    assert.equal(entry.studyMetadata.exampleImportPolicy, undefined);
    assert.deepEqual(entry.studyMetadata.subtopicIds, recorded.subtopic_ids);
    assert.equal(entry.tokens.map(t => t.text).join(''), recorded.headword);
    assert.ok(entry.tokens.every(t => !t.reviewed));
  }
  writeFileSync(paths.vocabularyPath, JSON.stringify(data));
  assert.deepEqual(importLevel5(paths).data, data);
});

test('reimport preserves current data, including timestamps', t => {
  assert.deepEqual(importLevel5(fixture(t)).data, vocabulary);
});

test('terms-only updates preserve attached word audio and separately imported examples', t => {
  const paths = fixture(t, data => {
    const entry = data.entries.find(e => e.hsk_index === 2001);
    entry.audio = { url: 'verified-word-recording' };
    entry.examples = [{ id: 'separate-reviewed-example', simplified: '哎！', pinyinDisplay: 'āi!', audio: null }];
  });
  const before = readVocabulary(paths.vocabularyPath);
  const { data } = importLevel5({ ...paths, includeExamples: false });
  assert.deepEqual(data.entries.map(e => [e.id, e.audio, e.examples]), before.entries.map(e => [e.id, e.audio, e.examples]));
});

test('reimport retains exact word and sentence recording attachments', t => {
  const paths = fixture(t, data => {
    const entry = data.entries.find(e => e.hsk_index === 2001);
    entry.audio = { url: 'verified-word-recording' };
    entry.examples[0].audio = { url: 'verified-sentence-recording' };
  });
  assert.deepEqual(importLevel5(paths).data, readVocabulary(paths.vocabularyPath));
});

test('keeps both displayed alternatives and binds the first sourced reading to its exact glyph', t => {
  const { data } = importLevel5(fixture(t));
  for (const [id, style, glyph, reading] of [[2084, 'conversational', '谁', 'shéi'], [2449, 'written', '熟', 'shú']]) {
    const example = data.entries.find(e => e.hsk_index === id).examples.find(ex => ex.style === style);
    assert.ok(example.pinyinDisplay.includes('/'));
    assert.equal(example.tokens.find(token => token.text === glyph).pinyin, reading);
  }
});

test('rejects unrecorded alternatives or alternatives paired to another glyph', t => {
  for (const [pinyin, error] of [['Nǐ ài / āi ma?', /Unrecorded or ambiguous reading alternatives/],
    ['Nǐ shéi / shuí ma?', /do not match their recorded glyph/]]) {
    const paths = fixture(t, () => {}, input => {
      Object.assign(input.entries[0].examples[0], { hanzi: '你爱吗？', pinyin });
    });
    assert.throws(() => importLevel5(paths), error);
  }
});

test('rejects incomplete or mismatched Level 5 identities', t => {
  const incomplete = fixture(t, data => { data.entries = data.entries.filter(e => e.hsk_index !== 2001); });
  assert.throws(() => importLevel5(incomplete), /complete and unique/);
  const mismatch = fixture(t, data => { data.entries.find(e => e.hsk_index === 2001).simplified = '错'; });
  assert.throws(() => importLevel5(mismatch), /ID\/headword mismatch/);
});
