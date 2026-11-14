import { readFileSync } from 'node:fs';
import type { CatalogData, CatalogFile, CharacterFile, ComponentFile, RadicalFile } from '@/lib/catalog-store';

/** Assemble fresh recorded rows for tests that need to rehydrate or mutate the catalogue.
 * Node filesystem access stays in test utilities; production uses loadCatalog(). */
export function readCatalog(): CatalogData {
  const metadata = JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as CatalogFile;
  const { characters } = JSON.parse(readFileSync('public/data/characters.json', 'utf8')) as CharacterFile;
  const { radicals } = JSON.parse(readFileSync('public/data/radicals.json', 'utf8')) as RadicalFile;
  const { components } = JSON.parse(readFileSync('public/data/components.json', 'utf8')) as ComponentFile;
  return { ...metadata, characters, radicals, components };
}
