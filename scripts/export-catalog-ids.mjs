#!/usr/bin/env node
/** Export exact, selectable Characters IDs from the shared catalogue. The app's
 * adapter owns component-only exclusions and ID construction; never duplicate
 * those rules or derive membership from decomposition, spelling or pronunciation.
 * Run: node scripts/export-catalog-ids.mjs [--check]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = new URL('../', import.meta.url);
const dataDirectory = new URL('public/data/', root);
const output = new URL('catalog_ids.json', dataDirectory);
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== '--check')) {
  throw new Error('Usage: node scripts/export-catalog-ids.mjs [--check]');
}

// Use the existing toolchain's TypeScript loader with the same @ alias as Vite.
const jiti = createJiti(import.meta.url, {
  alias: { '@': fileURLToPath(new URL('src/', root)) },
  fsCache: false,
});
const { hydrateCatalog } = await jiti.import(fileURLToPath(new URL('src/lib/catalog-store.ts', root)));
const { libraryEntries } = await jiti.import(fileURLToPath(new URL('src/lib/character-library.ts', root)));
const readData = name => JSON.parse(readFileSync(new URL(name, dataDirectory), 'utf8'));

// catalogue schema v2 splits section membership from shared metadata. Join the
// recorded files just as loadCatalog() does, without changing any source bytes.
const metadata = readData('catalog.json');
if (metadata.version !== 2) throw new Error('Unsupported catalogue schema; review the recorded section layout.');
hydrateCatalog(
  { ...metadata, ...readData('characters.json'), ...readData('components.json'), ...readData('radicals.json') },
  readData('radical-identities.json'),
  readData('radical-strokes.json'),
  readData('strokes.json'),
);

const characters = Object.create(null);
for (const { hanzi, id } of libraryEntries('Characters')) {
  if (!hanzi || Object.hasOwn(characters, hanzi)) throw new Error(`Missing or duplicate character identity: ${hanzi}`);
  characters[hanzi] = id;
}
if (!Object.keys(characters).length) throw new Error('No character records found; refusing to export an empty mapping.');
const serialized = `${JSON.stringify({ characters }, null, 2)}\n`;

if (args.includes('--check')) {
  // Accept platform checkout line endings while checking all recorded content.
  if (readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== serialized) {
    throw new Error('catalog_ids.json is stale. Run node scripts/export-catalog-ids.mjs.');
  }
  console.log(`Verified ${Object.keys(characters).length} exact character IDs.`);
} else {
  writeFileSync(output, serialized, 'utf8');
  console.log(`Wrote ${Object.keys(characters).length} exact character IDs to public/data/catalog_ids.json.`);
}
