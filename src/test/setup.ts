import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Tests read the same imported catalogue the browser fetches from /data/catalog.json.
import { readFileSync } from 'node:fs';
import { hydrateCatalog, type CatalogFile } from '@/lib/catalog-store';
import type { RadicalIdentityFile } from '@/lib/radical-identities';
hydrateCatalog(JSON.parse(readFileSync('public/data/catalog.json', 'utf8')) as CatalogFile, JSON.parse(readFileSync('public/data/radical-identities.json', 'utf8')) as RadicalIdentityFile);
