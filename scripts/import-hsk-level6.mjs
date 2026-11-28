#!/usr/bin/env node
/** Import the reviewed Level 6 handoff through the shared HSK identity/pinyin boundary.
 * Audit first; the compact part's byte limit is checked before any vocabulary write.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importHskLevel } from './import-hsk-level1.mjs';
import { dumpEntries, MAX_PART_BYTES, vocabularyParts, VOCABULARY_DIRECTORY, writeVocabulary } from './vocabulary-store.mjs';

export function importLevel6(options) {
  const result = importHskLevel({ ...options, level: 6 });
  const entries = result.data.entries.filter(e => e.hskLevel === 6);
  const bytes = Buffer.byteLength(dumpEntries(entries));
  // Measure the complete runtime records, including tokens and source evidence.
  const parts = [...vocabularyParts(entries)].map(([name, rows]) => ({ path: `src/data/vocabulary/${name}`,
    entries: rows.length, bytes: Buffer.byteLength(dumpEntries(rows)) }));
  result.report.output = { format: 'one compact entry per line', entries: entries.length,
    unsplitBytes: bytes, maxBytesExclusive: MAX_PART_BYTES, parts };
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!['--source', '--topics', '--vocabulary', '--output', '--report', '--write'].includes(key)) throw new Error(`Unknown argument: ${key}`);
    if (key === '--write') options.write = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value: ${key}`);
      options[key.slice(2)] = args[++i];
    }
  }
  const vocabularyPath = resolve(options.vocabulary ?? VOCABULARY_DIRECTORY);
  const { data, report } = importLevel6({
    sourcePath: resolve(options.source ?? 'importer/hsk/hsk3_level6_1.0.0.json'),
    topicsPath: resolve(options.topics ?? 'importer/hsk/hsk3_topics.json'), vocabularyPath,
  });
  if (options.write) writeVocabulary(resolve(options.output ?? vocabularyPath), data);
  if (options.report) writeFileSync(resolve(options.report), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ mode: options.write ? 'written' : 'audit-only', ...report }, null, 2));
}
