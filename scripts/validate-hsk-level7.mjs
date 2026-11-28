/** Validate the complete advanced editorial handoff against exact official rows
 * and the shared pinyin aligner. This verifies structure, never native fluency.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'importer/hsk/hsk3_level7_0.0.1.json';
const raw = readFileSync(path), source = JSON.parse(raw);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const official = read('importer/data/hsk-level7/official-vocabulary.json').filter(r => r.level === '7-9');
const overlay = read('importer/data/hsk-level7/sentence-drafts/pinyin-0.0.1.json');
const manifest = read('importer/data/hsk-level7/sentence-manifest.json');
assert.equal(source.schema_version, 'hsk-official-vocabulary-seed/0.0.1');
assert.deepEqual(source.syllabus.levels, [7, 8, 9]);
assert.equal(source.syllabus.level, null);
assert.equal(source.verification.import_ready, false);
assert.equal(source.entries.length, 5600);
assert.equal(overlay.entries.length, 5600);
assert.equal(digest(readFileSync(source.verification.sentences.manifest.path)), source.verification.sentences.manifest.sha256);
for (const record of [...manifest.drafts, manifest.pinyin]) {
  const bytes = readFileSync(record.path);
  assert.equal(bytes.length, record.bytes);
  assert.equal(digest(bytes), record.sha256);
}
for (const record of overlay.sources) {
  let bytes = readFileSync(record.path);
  assert.ok([undefined, 'lf'].includes(record.checksum_normalization));
  if (record.checksum_normalization === 'lf') bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(digest(bytes), record.sha256, `Pinyin provenance changed: ${record.path}`);
}
const styles = {}, sentences = [], translations = [];
let flagged = 0;
for (const [i, entry] of source.entries.entries()) {
  const row = official[i], reading = overlay.entries[i];
  assert.deepEqual([entry.id, entry.headword, entry.pinyin, entry.syllabus_headword, entry.syllabus_pos_zh, entry.homograph, entry.source_pdf_page],
    [row.id, row.hanzi, row.pinyin, row.entry, row.part_of_speech, row.homograph, row.source_pdf_page]);
  assert.equal(entry.id, 5401 + i);
  assert.equal(entry.meaning_en, null);
  assert.equal(entry.classification_status, 'pending');
  assert.equal(entry.examples.length, 1);
  const example = entry.examples[0];
  assert.ok(['written', 'conversational'].includes(example.style));
  assert.equal(example.provenance, 'newly_authored');
  assert.equal(example.review_status, 'editorial_draft_needs_language_review');
  assert.ok(example.hanzi.includes(entry.headword));
  assert.ok(example.english.trim() && !/[\u3400-\u9fff]/u.test(example.english));
  assert.equal(digest(Buffer.from(example.hanzi)), reading.hanzi_sha256);
  assert.equal(example.pinyin, reading.pinyin);
  assert.deepEqual(example.reading_review_flags ?? [], reading.review_flags);
  styles[example.style] = (styles[example.style] ?? 0) + 1;
  flagged += reading.review_flags.length > 0;
  sentences.push(example.hanzi);
  translations.push(example.english);
}
assert.equal(new Set(sentences).size, 5600);
assert.equal(new Set(translations).size, 5600);
assert.ok(raw.length < 9_000_000);
assert.equal(raw.toString('utf8').split('\n').filter(line => line.startsWith('{"id":')).length, 5600);

const requests = source.entries.map(e => ({ id: e.id, hanzi: e.examples[0].hanzi, pinyin: e.examples[0].pinyin }));
const aligned = JSON.parse(execFileSync(process.execPath, ['scripts/hsk-level7-reading-lexicon.mjs'], {
  input: JSON.stringify(requests), encoding: 'utf8', maxBuffer: 20_000_000,
}));
for (const [i, result] of aligned.entries()) {
  assert.equal(result.id, source.entries[i].id);
  assert.ok(result.syllables, `Pinyin alignment failed for ${result.id}`);
  const { start, end, sentence_syllables: target } = overlay.entries[i].target;
  const sentence = Array.from(source.entries[i].examples[0].hanzi);
  const syllableStart = sentence.slice(0, start).filter(c => /[\u3400-\u9fff\uf900-\ufaff]/u.test(c)).length;
  assert.equal(sentence.slice(start, end).join(''), source.entries[i].headword);
  assert.deepEqual(result.syllables.slice(syllableStart, syllableStart + target.length).map(s => s.toLowerCase()), target.map(s => s.toLowerCase()));
}
const report = {
  schema_version: 'hsk-level7-sentence-validation/0.0.1',
  output: { path, bytes: raw.length, sha256: digest(raw), split_needed: false },
  official_entries: 5600, examples: 5600, styles, unique_chinese_sentences: 5600,
  unique_english_translations: 5600, aligned_readings: aligned.length,
  exact_official_identities_preserved: true, sentences_with_reading_review_flags: flagged,
  status: 'editorial_draft_needs_language_review', runtime_import_ready: false,
};
const reportAt = process.argv.indexOf('--report');
if (reportAt !== -1) {
  assert.ok(process.argv[reportAt + 1], 'Expected a report path');
  writeFileSync(process.argv[reportAt + 1], `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
