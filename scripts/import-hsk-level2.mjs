#!/usr/bin/env node
/** Audit or replace Level 2 study content using the shared fail-closed HSK importer.
 * Keeps exact syllabus entry IDs, explicit kinds and word audio; retires old examples.
 */
import { writeFileSync } from 'node:fs';
import { VOCABULARY_DIRECTORY, writeVocabulary } from './vocabulary-store.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importHskLevel } from './import-hsk-level1.mjs';

export const importLevel2 = options => importHskLevel({ ...options, level: 2 });

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
  const { data, report } = importLevel2({
    sourcePath: resolve(options.source ?? 'importer/hsk/hsk3_level2_1.0.3.json'),
    topicsPath: resolve(options.topics ?? 'importer/hsk/hsk3_topics.json'), vocabularyPath,
  });
  if (options.write) writeVocabulary(resolve(options.output ?? vocabularyPath), data);
  if (options.report) writeFileSync(resolve(options.report), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ mode: options.write ? 'written' : 'audit-only', ...report }, null, 2));
}
