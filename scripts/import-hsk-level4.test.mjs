/** Level 4 import preserves source identity, readings, and other levels. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLevel4 } from './import-hsk-level4.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

const sourceRaw = readFileSync('importer/hsk/hsk3_level4_1.0.3.json');
const source = JSON.parse(sourceRaw);
const vocabulary = readVocabulary();
const checksum = createHash('sha256').update(sourceRaw).digest('hex');

function fixture(t, data = vocabulary, editSource = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk4-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const vocabularyPath = join(directory, 'vocabulary.json');
  const sourcePath = join(directory, 'hsk3_level4_1.0.3.json');
  const edited = structuredClone(source);
  editSource(edited);
  writeFileSync(sourcePath, JSON.stringify(edited) === JSON.stringify(source) ? sourceRaw : JSON.stringify(edited));
  writeFileSync(vocabularyPath, JSON.stringify(data));
  return { sourcePath, topicsPath: 'importer/hsk/hsk3_topics.json', vocabularyPath };
}

test('creates all Level 4 records and reimports them without changing any record', t => {
  const before = structuredClone(vocabulary);
  before.entries = before.entries.filter(e => e.hskLevel !== 4);
  const paths = fixture(t, before);
  const { data, report } = importLevel4(paths);
  const entries = data.entries.filter(e => e.hskLevel === 4);
  assert.equal(entries.length, 1000);
  assert.equal(report.alignedExamples, 2000);
  assert.deepEqual(data.entries.filter(e => e.hskLevel !== 4), before.entries);
  for (const recorded of source.entries) {
    const entry = entries.find(e => e.hsk_index === recorded.id);
    assert.equal(entry.simplified, recorded.headword);
    assert.equal(entry.pinyinDisplay, recorded.pinyin);
    assert.deepEqual(entry.meanings, recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
    assert.equal(entry.studyMetadata.sourceSha256, checksum);
    assert.equal(entry.studyMetadata.verificationStatus, source.verification.status);
    assert.deepEqual(entry.examples.map(e => [e.simplified, e.pinyinDisplay, e.english]), recorded.examples.map(e => [e.hanzi, e.pinyin, e.english]));
    assert.ok(entry.audio === null && entry.examples.every(e => e.audio === null && e.tokens.map(t => t.text).join('') === e.simplified));
  }
  const homographs = entries.filter(e => e.simplified === '重');
  assert.equal(homographs.length, 2);
  assert.equal(new Set(homographs.map(e => e.id)).size, 2);
  assert.deepEqual(entries.find(e => e.hsk_index === 1139).examples[0].tokens.filter(t => t.kind === 'hanzi').map(t => t.pinyin), ['Dào', 'diǎn', 'r', 'shuǐ', 'ba']);
  assert.equal(entries.find(e => e.hsk_index === 1534).tokens[0].pinyin, 'ǹg');
  writeFileSync(paths.vocabularyPath, JSON.stringify(data));
  assert.deepEqual(importLevel4(paths).data, data);
  const withoutTimestamps = entries => entries.map(({ createdAt, updatedAt, ...entry }) => entry);
  assert.deepEqual(withoutTimestamps(data.entries), withoutTimestamps(vocabulary.entries));
});

test('fails closed for an erhua r not paired with 儿 or a syllabic nasal on another glyph', t => {
  const noErhua = fixture(t, vocabulary, source => { source.entries.find(e => e.id === 1139).examples[0].hanzi = '倒点山水吧。'; });
  assert.throws(() => importLevel4(noErhua), /Ambiguous or mismatched pinyin/);
  const wrongNasal = fixture(t, vocabulary, source => { source.entries.find(e => e.id === 1534).examples[0].hanzi = '山，我知道了。'; });
  assert.throws(() => importLevel4(wrongNasal), /Unsupported syllabic nasal/);
});

test('rejects incomplete or conflicting existing Level 4 identities', t => {
  const incomplete = structuredClone(vocabulary);
  incomplete.entries = incomplete.entries.filter(e => e.hsk_index !== 1001);
  assert.throws(() => importLevel4(fixture(t, incomplete)), /complete and unique/);
  const conflict = structuredClone(vocabulary);
  conflict.entries.find(e => e.hsk_index === 1001).simplified = '不同';
  assert.throws(() => importLevel4(fixture(t, conflict)), /ID\/headword mismatch/);
});
