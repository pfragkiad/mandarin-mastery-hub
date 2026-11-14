# Glyph catalogue data layout

This document describes the section-file migration for other engines, importers, and maintainers. Paths below are relative to the repository root. The application still exposes one logical catalogue through `src/lib/catalog-store.ts`; the JSON storage is split by glyph section.

## Directory usage guides

| Location | Responsibility | Local guide |
| --- | --- | --- |
| `public/data/` | Standalone runtime JSON and shared public source records | [README](README.md) |
| `src/data/` | JSON imported through TypeScript, either immediately or in lazy chunks | [README](../../src/data/README.md) |
| `importer/data/` | Source files used only by offline importers | [README](../../importer/data/README.md) |
| `reports/` | Standalone offline analysis and review documents | [README](../../reports/README.md) |
| `scripts/` | Import and build code that reads sources and writes runtime outputs | [README](../../scripts/README.md) |

Each active data subdirectory also has its own usage README. This directory split controls packaging and loading, not privacy: data fetched by or bundled into the public app can be downloaded by its users.

## Migration from the monolithic catalogue

Previously, `public/data/catalog.json` contained `characters`, `radicals`, `components`, and `strokes` arrays together with shared data. Strokes were extracted first. The remaining three row arrays now also live in separate files. `catalog.json` has schema `version: 2` and contains no glyph section arrays.

This is a storage change. All recorded rows, row ordering, exact glyphs, readings, meanings, notes, script metadata, trees, audio attachments, and provenance were preserved. The source description remains the recorded import description. No records were reclassified or deduplicated during the split.

Deploy the shared file and all section files together with the updated loader. Consumers that formerly read `catalog.characters`, `catalog.radicals`, or `catalog.components` directly from the JSON file must join the corresponding files. There is no fallback to embedded section arrays.

## Files and ownership

| File | Top-level content | Purpose |
| --- | --- | --- |
| `public/data/characters.json` | `{ "characters": [...] }` | 9,575 raw character rows at migration time. Presentation excludes the 38 pure component forms, leaving 9,537 Characters entries. |
| `public/data/components.json` | `{ "components": [...] }` | 1,843 raw component rows at migration time. |
| `public/data/radicals.json` | `{ "radicals": [...] }` | Exactly 214 Kangxi heading rows; variants remain in their family sidecars. |
| `public/data/strokes.json` | `{ "strokes": [...] }` | 38 stroke-type rows, including recorded symbols, readings, descriptions, and source notes. These are not handwriting paths. |
| `public/data/catalog.json` | Shared fields described below | Import metadata, decompositions, pronunciation bindings, and reviewed annotations shared across sections. |

The shared `catalog.json` fields are:

- `version`: on-disk schema version, now `2`.
- `source`: recorded description of the imported reference sources.
- `trees`: exact-glyph Make Me a Hanzi decomposition trees. Their structure, positions, and source identity must remain unchanged.
- `readingAudio`: exact glyph → exact reading → recording ID or null.
- `audio`: recording ID → attachment, including CDN URL and source/license metadata. Media binaries remain outside the repository.
- `componentRadicals`: exact component glyph → dictionary radical, sourced from Unihan kRSUnicode.
- `readingRevisions`: owner-reviewed reading changes with their sources and approval metadata.
- `readingMeanings`: owner-reviewed per-reading meanings, guarded against the current recorded combined meaning and reading list.
- `meaningPointers`: owner-reviewed links from a recorded sense to the related character that owns it.

Section membership belongs to the section file. Shared fields must not be copied into each section file. Keep independent sidecars such as `radical-identities.json`, `radical-strokes.json`, `usage-order.json`, `character-variants-v1.4.0.json`, and per-glyph enrichment files in their existing roles. In particular, `radicals.json` contains library headings; `radical-strokes.json` contains family-qualified exact forms, variants, stroke sequences, and provenance.

## Row format and identities

Each section uses the same `CatalogRow` tuple:

```ts
[glyph: string, reading: string, meaning: string, note: string, script?: CharacterScript]
```

Preserve tuple positions, optional fields, exact Unicode strings, and source ordering. A missing reading stays missing; component names and family readings are not lexical pronunciations. Use recorded script metadata rather than character shape or normalization.

The library still creates record IDs as `${kind}:${glyph}`, where `kind` is `Characters`, `Components`, `Radicals`, or `Strokes`. Do not merge same-glyph records across kinds. A saved radical variant additionally retains its heading and exact family form key. File separation must never change bookmarks, URL selections, record links, or variant identities.

## Browser loading and the shared interface

`loadCatalog()` in `src/lib/catalog-store.ts` fetches the shared file, all four row files, and the existing required sidecars concurrently. Loading remains lazy at the catalogue level: the JSON files are fetched at runtime and are never imported into page bundles. This migration does not introduce independent per-tab loading, because cross-section search, lookups, and practice need a coherent catalogue.

`CatalogFile` describes the shared JSON payload. `CharacterFile`, `RadicalFile`, `ComponentFile`, and `StrokeFile` describe the section payloads. `CatalogData` is the in-memory join of `CatalogFile` with the character, radical, and component rows. Hydration receives strokes as the existing separate fourth argument:

```ts
hydrateCatalog(
  { ...metadata, characters: characters.characters, radicals: radicals.radicals, components: components.components },
  radicalIdentities,
  radicalStrokes,
  strokeCatalog,
);
```

Production consumers should await `loadCatalog()` and use `catalog`, `libraryEntries()`, or existing presentation adapters. Do not fetch section files independently in UI components. The loader shares concurrent requests, waits for every required request before publishing the catalogue, and allows retry after a failed request. Hydration mutates the existing row arrays in place and then increments `catalog.version` so caches and workspace consumers recompute. That runtime counter is distinct from the on-disk schema `version`.

For another engine, the equivalent Python join is:

```python
import json
from pathlib import Path

root = Path('public/data')
catalog = json.loads((root / 'catalog.json').read_text(encoding='utf8'))
for section in ('characters', 'radicals', 'components', 'strokes'):
    catalog[section] = json.loads(
        (root / f'{section}.json').read_text(encoding='utf8')
    )[section]
```

This joined object is an in-memory view. When writing a correction, update the owning file instead of writing the joined object back into `catalog.json`.

## Importers and maintenance

| Importer | Catalogue files it reads or updates |
| --- | --- |
| `scripts/import-radical-strokes.ts` | Reads heading rows from `radicals.json` and stroke symbols from `strokes.json`, alongside the supplied versioned radical-family source. Writes `radical-strokes.json`. |
| `scripts/import-radical-identities.py` | Reads `radicals.json`, `characters.json`, and shared `catalog.json` fields alongside its pinned sources and radical-stroke sidecar. Writes `radical-identities.json`. |
| `scripts/import-component-radicals.py` | Reads `components.json` and `radicals.json`; updates only `componentRadicals` in shared `catalog.json`. |
| `scripts/import-character-variants.py` | Reads `characters.json`. This remains the legacy Unihan exporter; its `character-variants.json` output does not replace the active owner-curated `character-variants-v1.4.0.json`. |
| `scripts/import-character-enrichment.py` | Continues reading decomposition trees from shared `catalog.json`; does not require row files. |

Importer-only inputs belong under `importer/data/` (see [importer/README.md](../../importer/README.md)). The radical-identity importer reads `importer/data/radical-identities/review.json` and its pinned Unicode text inputs from that same directory; their bytes and checksums are preserved. Standalone offline audit, notes, and report JSON files belong in `reports/` (see [reports/README.md](../../reports/README.md)). Keep shared runtime sources at their existing URLs: variant details fetch `public/data/radical_variant_etymology_audit.json`, and the radical-family source is linked for source records and license notices. Generated runtime datasets and their embedded notes remain in their existing data locations.

Tests that need a fresh logical catalogue use `readCatalog()` from `src/test/catalog-fixture.ts`. This Node-only helper must never be imported into application code. Browser-loading tests cover the section join, retained array identities, shared concurrent requests, and retry without publishing incomplete rows. Existing library, pronunciation, radical, and practice tests cover the preserved record behavior.

Run `npm test` and `npx tsc --noEmit` to validate changes. On Windows PowerShell use `npm.cmd` / `npx.cmd` when execution policy blocks the `.ps1` wrappers. If Node's experimental web storage shadows jsdom's storage, set `$env:NODE_OPTIONS = '--no-experimental-webstorage'` for the test process.

When adding rows, also check the repository's font-subset coverage tests and the data provenance rules in `AGENTS.md`. Keep documented counts current if the underlying records change; counts above describe the migration, not a new classification rule.
