// Node twin of scripts/vocabulary_store.py: the vocabulary is one { categories, entries }
// object to importers, stored in src/data/vocabulary/ as index.json (top-level keys + ordered
// `parts`) plus one part per HSK level (level-N.json, unlevelled.json), keeping every file
// smaller than the original. An optional entryOrder preserves interleaved levels.
// A *.json path is one combined file (fixtures).
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VOCABULARY_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/vocabulary');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const dump = value => `${JSON.stringify(value, null, 4)}\n`;
// Level parts: one compact entry per line, byte-identical to vocabulary_store.py's dump_entries,
// so diffs stay per entry and each part stays under the repository's 10 MB per-file limit.
export const dumpEntries = entries => (entries.length ? `[\n${entries.map(entry => JSON.stringify(entry)).join(',\n')}\n]\n` : '[]\n');
export const partName = entry => (entry.hskLevel == null ? 'unlevelled.json' : `level-${entry.hskLevel}.json`);

export function readVocabulary(path = VOCABULARY_DIRECTORY) {
  if (path.endsWith('.json')) return read(path);
  const { parts, entryOrder, ...rest } = read(join(path, 'index.json'));
  const entries = parts.flatMap(name => read(join(path, name)));
  if (!entryOrder) return { ...rest, entries };
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  if (byId.size !== entries.length || entryOrder.length !== entries.length ||
      new Set(entryOrder).size !== entries.length || entryOrder.some(id => !byId.has(id))) {
    throw new Error('Invalid vocabulary entry order');
  }
  return { ...rest, entries: entryOrder.map(id => byId.get(id)) };
}

export function writeVocabulary(path = VOCABULARY_DIRECTORY, data) {
  if (path.endsWith('.json')) return writeFileSync(path, dump(data));
  const parts = new Map();
  for (const entry of data.entries) {
    const name = partName(entry);
    if (!parts.has(name)) parts.set(name, []);
    parts.get(name).push(entry);
  }
  const grouped = [...parts.values()].flat();
  const entryOrder = data.entries.map(entry => entry.id);
  if (entryOrder.some(id => typeof id !== 'string') || new Set(entryOrder).size !== entryOrder.length) {
    throw new Error('Vocabulary entries must have unique string IDs');
  }
  const interleaved = grouped.some((entry, index) => entry.id !== entryOrder[index]);
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  for (const stale of readdirSync(path).filter(name => name.endsWith('.json') && name !== 'index.json' && !parts.has(name))) unlinkSync(join(path, stale));
  for (const [name, entries] of parts) writeFileSync(join(path, name), dumpEntries(entries));
  const { entries: _entries, ...rest } = data;
  writeFileSync(join(path, 'index.json'), dump({ ...rest, parts: [...parts.keys()], ...(interleaved ? { entryOrder } : {}) }));
}
