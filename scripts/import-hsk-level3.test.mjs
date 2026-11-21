/** Level 3 creates stable, independently sourced records and rejects unsafe reimports. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLevel3 } from './import-hsk-level3.mjs';

const sourcePath = 'importer/hsk/hsk3_level3_1.0.4.json';
const topicsPath = 'importer/hsk/hsk3_topics.json';
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const vocabulary = JSON.parse(readFileSync('src/data/vocabulary.json', 'utf8'));

function fixture(t, data = vocabulary) {
  const directory = mkdtempSync(join(tmpdir(), 'mandarin-hsk3-import-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const vocabularyPath = join(directory, 'vocabulary.json');
  writeFileSync(vocabularyPath, JSON.stringify(data));
  return { sourcePath, topicsPath, vocabularyPath };
}

test('creates all Level 3 records and reimports them without changing any record', t => {
  const before = structuredClone(vocabulary);
  before.entries = before.entries.filter(e => e.hskLevel !== 3);
  const paths = fixture(t, before);
  const first = importLevel3(paths);
  const entries = first.data.entries.filter(e => e.hskLevel === 3);
  assert.equal(entries.length, 500);
  assert.deepEqual(first.data.entries.filter(e => e.hskLevel !== 3), before.entries);
  assert.equal(first.report.alignedExamples, 1000);
  for (const recorded of source.entries) {
    const entry = entries.find(e => e.hsk_index === recorded.id);
    assert.equal(entry.simplified, recorded.headword);
    assert.equal(entry.pinyinDisplay, recorded.pinyin);
    assert.deepEqual(entry.meanings, recorded.meaning_en.split(';').map(s => s.trim()).filter(Boolean));
    assert.equal(entry.studyMetadata.source.sourceId, String(recorded.id));
    assert.equal(entry.studyMetadata.verificationStatus, source.verification.status);
    assert.deepEqual(entry.studyMetadata.posIds, recorded.pos_ids);
    assert.equal(entry.studyMetadata.primaryPosId, recorded.primary_pos_id);
    assert.deepEqual(entry.examples.map(e => [e.simplified, e.pinyinDisplay, e.english]), recorded.examples.map(e => [e.hanzi, e.pinyin, e.english]));
    assert.ok(entry.examples.every(e => e.audio === null && e.tokens.map(t => t.text).join('') === e.simplified));
  }
  const homographs = entries.filter(e => e.simplified === '得');
  assert.equal(homographs.length, 2);
  assert.equal(new Set(homographs.map(e => e.id)).size, 2);
  assert.deepEqual(entries.find(e => e.hsk_index === 670).tokens.map(t => t.pinyin), ['hóng', 'lǜ', 'dēng']);
  writeFileSync(paths.vocabularyPath, JSON.stringify(first.data));
  assert.deepEqual(importLevel3(paths).data, first.data);
});

test('rejects incomplete or conflicting existing Level 3 identities', t => {
  const incomplete = structuredClone(vocabulary);
  incomplete.entries = incomplete.entries.filter(e => e.hsk_index !== 501);
  assert.throws(() => importLevel3(fixture(t, incomplete)), /complete and unique/);
  const conflict = structuredClone(vocabulary);
  conflict.entries.find(e => e.hsk_index === 501).simplified = '不同';
  assert.throws(() => importLevel3(fixture(t, conflict)), /ID\/headword mismatch/);
});
