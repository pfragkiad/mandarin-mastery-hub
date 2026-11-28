/** Level 4 import preserves source identity, readings, and other levels. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLevel4 } from './import-hsk-level4.mjs';
import { readVocabulary } from './vocabulary-store.mjs';

const sourceRaw = readFileSync('importer/hsk/hsk3_level4_1.1.2.json');
const source = JSON.parse(sourceRaw);
const vocabulary = readVocabulary();
const checksum = createHash('sha256').update(sourceRaw).digest('hex');

function fixture(t, data = vocabulary, editSource = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk4-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const vocabularyPath = join(directory, 'vocabulary.json');
  const sourcePath = join(directory, 'hsk3_level4_1.1.2.json');
  const edited = structuredClone(source);
  editSource(edited);
  writeFileSync(sourcePath, JSON.stringify(edited) === JSON.stringify(source) ? sourceRaw : JSON.stringify(edited));
  const stored = structuredClone(data);
  if (JSON.stringify(edited) !== JSON.stringify(source)) {
    const pin = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
    for (const e of stored.entries.filter(e => e.hskLevel === 4)) e.studyMetadata.sourceSha256 = pin;
  }
  writeFileSync(vocabularyPath, JSON.stringify(stored));
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
    assert.deepEqual(entry.examples.map(e => [e.simplified, e.pinyinDisplay, e.english, e.notes, e.register, e.reviewStatus]),
      recorded.examples.map(e => [e.hanzi, e.pinyin, e.english, e.note, e.register, e.review_status]));
    assert.ok(entry.audio === null && entry.examples.every(e => e.audio === null && e.tokens.map(t => t.text).join('') === e.simplified));
  }
  const homographs = entries.filter(e => e.simplified === '重');
  assert.equal(homographs.length, 2);
  assert.equal(new Set(homographs.map(e => e.id)).size, 2);
  assert.deepEqual(entries.find(e => e.studyMetadata.numberingRevision.previousId === 1139).examples[0].tokens.filter(t => t.kind === 'hanzi').map(t => t.pinyin), ['Dào', 'diǎn', 'r', 'shuǐ', 'ba']);
  assert.equal(entries.find(e => e.studyMetadata.numberingRevision.previousId === 1534).tokens[0].pinyin, 'ǹg');
  writeFileSync(paths.vocabularyPath, JSON.stringify(data));
  assert.deepEqual(importLevel4(paths).data, data);
  // Fresh records cite the current handoff; existing records retain their original syllabus provenance.
  const withoutTimestamps = entries => entries.map(({ createdAt, updatedAt, sourceName, sourceVersion, hskSource, secondarySources, ...entry }) =>
    entry.hskLevel === 4 ? { ...entry, audio: null } : entry);
  // A fresh Level 4 is appended after any later levels; compare its stable identities
  // independently of that creation order. The other-level order was checked above.
  const byId = (a, b) => a.id.localeCompare(b.id);
  assert.deepEqual(withoutTimestamps(data.entries).sort(byId), withoutTimestamps(vocabulary.entries).sort(byId));
});

test('reimports the current Level 4 with all existing identities and recordings intact', t => {
  assert.deepEqual(importLevel4(fixture(t)).data, vocabulary);
});

test('fails closed for an erhua r not paired with 儿 or a syllabic nasal on another glyph', t => {
  const noErhua = fixture(t, vocabulary, source => { source.entries.find(e => e.legacy_syllabus_id === 1139).examples[0].hanzi = '倒点山水吧。'; });
  assert.throws(() => importLevel4(noErhua), /Ambiguous or mismatched pinyin/);
  const wrongNasal = fixture(t, vocabulary, source => { source.entries.find(e => e.legacy_syllabus_id === 1534).examples[0].hanzi = '山，我知道了。'; });
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
