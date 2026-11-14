# Public runtime data

Files here are served directly below `/data/`. They are publicly downloadable from the deployed app. JSON is fetched at runtime rather than imported into page JavaScript bundles.

The complete glyph file layout and migration contract are in [catalog.md](catalog.md). Use the shared `loadCatalog()` in `src/lib/catalog-store.ts` instead of adding category fetches to individual components. It loads the catalogue files and required sidecars together, retains row-array identities, and publishes a new runtime version after loading succeeds.

| File or directory | Purpose and consumer |
| --- | --- |
| `characters.json`, `components.json`, `radicals.json`, `strokes.json` | Recorded glyph row arrays, each under its matching top-level key. The shared loader exposes them through one logical catalogue. |
| `catalog.json` | Schema version 2 shared metadata: decomposition trees, audio bindings, component radical assignments, and reviewed reading/meaning annotations. No category row arrays are embedded here. |
| `radical-identities.json` | Generated exact Kangxi identities and contextual shared-form rules; loaded with the catalogue. |
| `radical-strokes.json` | Generated family-qualified radical forms, recorded stroke sequences, and provenance; loaded with the catalogue. |
| `usage-order.json` | Exact recorded per-scope frequency ranks and exposure statistics; loaded with the catalogue. |
| `character-variants-v1.4.0.json` | Active owner-curated script associations and lexical caveats; loaded with the catalogue. The old generated `character-variants.json` is not the active source. |
| `radical-families-source.json` | Shared versioned input for stroke/outline importers, also linked by radical-family details for source and license notices. |
| `radical_variant_etymology_audit.json` | Lazily fetched by variant details; also supplies the contextual-identity importer and provenance tests. Its audit filename does not make it an offline-only report. |
| [character-enrichment/](character-enrichment/README.md) | Optional per-glyph decomposition/stroke mappings, validated against source checksums. |
| [supplementary-outlines/](supplementary-outlines/README.md) | Owner-reviewed supplementary handwriting geometry for explicitly recorded forms. |

Keep exact recorded glyphs, row order, IDs, source fields, and nulls intact. Do not infer missing pronunciations, script identities, or stroke paths. Audio attachments contain CDN URLs and attribution, never repository media binaries.

Store importer-only source material in [importer/data/](../../importer/data/README.md), and standalone offline reports in [reports/](../../reports/README.md). Deploy changed JSON files with the matching loader code. See [scripts/README.md](../../scripts/README.md) for the generators and [src/data/README.md](../../src/data/README.md) for data packaged through TypeScript imports.
