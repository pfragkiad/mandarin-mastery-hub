import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readVocabulary, writeVocabulary } from './vocabulary-store.mjs';

test('split storage round-trips interleaved levels and rejects an invalid order', t => {
  const directory = mkdtempSync(join(tmpdir(), 'vocabulary-store-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = {
    categories: [{ id: 'category' }],
    entries: [
      { id: 'a', hskLevel: 1, audio: { url: 'https://example.test/a' } },
      { id: 'b', hskLevel: null },
      { id: 'c', hskLevel: 1 },
      { id: 'd', hskLevel: 2 },
    ],
  };
  writeVocabulary(directory, data);
  assert.deepEqual(readVocabulary(directory), data);
  const indexPath = join(directory, 'index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  index.entryOrder[0] = 'missing';
  writeFileSync(indexPath, JSON.stringify(index));
  assert.throws(() => readVocabulary(directory), /Invalid vocabulary entry order/);
});

test('splits a level by UTF-8 bytes and removes obsolete parts on a smaller rewrite', t => {
  const directory = mkdtempSync(join(tmpdir(), 'vocabulary-store-size-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = { categories: [], entries: Array.from({ length: 4 }, (_, i) => ({
    id: String(i), hskLevel: 6, simplified: '\u6c49'.repeat(800_000), audio: { url: 'https://example.test/clip' },
  })) };
  writeVocabulary(directory, data);
  const index = JSON.parse(readFileSync(join(directory, 'index.json'), 'utf8'));
  assert.deepEqual(index.parts, ['level-6-part-1.json', 'level-6-part-2.json']);
  for (const name of index.parts) {
    const bytes = readFileSync(join(directory, name));
    assert.ok(bytes.length < 9_000_000);
    assert.equal(bytes.toString().trim().split('\n').length, 4);
  }
  assert.deepEqual(readVocabulary(directory), data);
  data.entries = [{ id: 'small', hskLevel: 6 }];
  writeVocabulary(directory, data);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, 'index.json'), 'utf8')).parts, ['level-6.json']);
  assert.deepEqual(readVocabulary(directory), data);
});
