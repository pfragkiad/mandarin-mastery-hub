# Data imported through TypeScript

JSON here is imported by application modules. Static imports make data available with the importing JavaScript; dynamic imports create on-demand chunks. This directory is not private storage: these browser-consumed records are retrievable from the shipped application.

| File or directory | Loading and purpose | Producer |
| --- | --- | --- |
| `vocabulary.json` | Static import in `src/lib/data-contract.ts`. Holds categories and vocabulary entries in the Mandarin Tutor API shape, with optional sourced study/example metadata. Session additions remain separate from the imported records. | Original vocabulary export; `scripts/import-hsk-level1.mjs` replaces all Level 1 data from the [versioned handoff and topic sidecar](../../importer/hsk/README.md). The earlier unofficial phrase import has been removed from Level 1. |
| `radical-contextual-identities.json` | Static import in `src/lib/radical-contextual-identity.ts`. Small reviewed identity subset needed synchronously for exact family/form/glyph presentation. | `scripts/import-radical-contextual-identities.py` extracts recorded fields from the public etymology audit. |
| `supplementary-outlines.json` | Static manifest import in `src/lib/character-enrichment.ts`. Lists covered exact glyphs and public geometry URLs; contains no inferred outlines. | `scripts/import-supplementary-outlines.py`. |
| `babelstone-components.json` | Dynamic import in `src/lib/babelstone-components.ts`. Resolves numbered source tokens on demand without replacing their source identities. | `scripts/import-babelstone-components.py` reads a supplied IDS source. |
| [pinyin/](pinyin/README.md) | Dynamic imports in `src/lib/pinyin-guide.ts` for the syllable inventory and recording manifest. | `scripts/import-pinyin-audio.py`. |
| [study_lessons/](study_lessons/README.md) | `src/lib/lessons.ts`: eager named-key imports of each lesson's summary keys, dynamic import of a whole lesson when its page opens. Lesson JSON plus the shared category registry. | Supplied lesson files (Markdown copies are generated from the JSON by the owner's `generate_lesson.py`). |

Use existing adapters rather than importing the same dataset into new UI components. Preserve API entry IDs, explicit word/phrase kinds, field-level provenance, exact readings, and CDN audio attachments. Vocabulary changes may require rebuilding font subsets; the font coverage tests check this.

The larger fetched glyph catalogue lives in [public/data/](../../public/data/README.md). Importer-only inputs live in [importer/data/](../../importer/data/README.md). See [catalog.md](../../public/data/catalog.md) for the shared catalogue contract and [scripts/README.md](../../scripts/README.md) for generators.
