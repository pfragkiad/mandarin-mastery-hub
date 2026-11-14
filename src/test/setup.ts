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

// Tests assemble the same imported row files and sidecars the browser fetches.
import { readFileSync } from 'node:fs';
import { hydrateCatalog, type StrokeFile } from '@/lib/catalog-store';
import { readCatalog } from './catalog-fixture';
import type { RadicalIdentityFile } from '@/lib/radical-identities';
import type { RadicalStrokeFile } from '@/lib/radical-strokes';
hydrateCatalog(readCatalog(), JSON.parse(readFileSync('public/data/radical-identities.json', 'utf8')) as RadicalIdentityFile, JSON.parse(readFileSync('public/data/radical-strokes.json', 'utf8')) as RadicalStrokeFile, JSON.parse(readFileSync('public/data/strokes.json', 'utf8')) as StrokeFile);
