// Node twin of scripts/vocabulary_store.py: the vocabulary is one { categories, entries }
// object to importers, stored in src/data/vocabulary/ as index.json (top-level keys + ordered
// `parts`) plus one part per HSK level (level-N.json, unlevelled.json), keeping every file
// under the repository's per-file size limit. Parts follow each level's first appearance, so
// a level's entries keep their relative order. A *.json path is one combined file (fixtures).
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VOCABULARY_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/vocabulary');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const dump = value => `${JSON.stringify(value, null, 4)}\n`;
export const partName = entry => (entry.hskLevel == null ? 'unlevelled.json' : `level-${entry.hskLevel}.json`);

export function readVocabulary(path = VOCABULARY_DIRECTORY) {
  if (path.endsWith('.json')) return read(path);
  const { parts, ...rest } = read(join(path, 'index.json'));
  return { ...rest, entries: parts.flatMap(name => read(join(path, name))) };
}

export function writeVocabulary(path = VOCABULARY_DIRECTORY, data) {
  if (path.endsWith('.json')) return writeFileSync(path, dump(data));
  const parts = new Map();
  for (const entry of data.entries) {
    const name = partName(entry);
    if (!parts.has(name)) parts.set(name, []);
    parts.get(name).push(entry);
  }
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  for (const stale of readdirSync(path).filter(name => name.endsWith('.json') && name !== 'index.json' && !parts.has(name))) unlinkSync(join(path, stale));
  for (const [name, entries] of parts) writeFileSync(join(path, name), dump(entries));
  const { entries: _entries, ...rest } = data;
  writeFileSync(join(path, 'index.json'), dump({ ...rest, parts: [...parts.keys()] }));
}
