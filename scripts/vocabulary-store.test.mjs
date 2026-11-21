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
