# Data imported through TypeScript

JSON here is imported by application modules. Static imports make data available with the importing JavaScript; dynamic imports create on-demand chunks. This directory is not private storage: these browser-consumed records are retrievable from the shipped application.

| File or directory | Loading and purpose | Producer |
| --- | --- | --- |
| `vocabulary.json` | Static import in `src/lib/data-contract.ts`. Holds categories and vocabulary entries in the Mandarin Tutor API shape, with optional sourced study/example metadata. Session additions remain separate from the imported records. | Original vocabulary export; the four `scripts/import-hsk-level*.mjs` importers use the [versioned handoffs and shared topics](../../importer/hsk/README.md). Level 1's unofficial phrases and all legacy Level 2 examples have been removed. |
| `radical-contextual-identities.json` | Static import in `src/lib/radical-contextual-identity.ts`. Small reviewed identity subset needed synchronously for exact family/form/glyph presentation. | `scripts/import-radical-contextual-identities.py` extracts recorded fields from the public etymology audit. |
| `supplementary-outlines.json` | Static manifest import in `src/lib/character-enrichment.ts`. Lists covered exact glyphs and public geometry URLs; contains no inferred outlines. | `scripts/import-supplementary-outlines.py`. |
| `finder-missing.json` | Static import in `src/lib/hanzi-finder-records.ts`. Copy of the finder index's `missing` list, so detail cards offer "Find similar" only for glyphs with recorded strokes without fetching the index. | `scripts/build-finder-medians.py` (written with `public/data/finder-medians.json`). |
| `mnemonics.json` | Static import in `src/lib/mnemonics.ts`. Optional alt captions for memory pictures, keyed by the exact lowercase-hex code point of the pointer file name in [src/assets/mnemonics/](../assets/mnemonics/README.md). Memory aids only, never lexical data. | Owner-written captions. |
| `babelstone-components.json` | Dynamic import in `src/lib/babelstone-components.ts`. Resolves numbered source tokens on demand without replacing their source identities. | `scripts/import-babelstone-components.py` reads a supplied IDS source. |
| [pinyin/](pinyin/README.md) | Dynamic imports in `src/lib/pinyin-guide.ts` for the syllable inventory and recording manifest. | `scripts/import-pinyin-audio.py`. |
| [study_lessons/](study_lessons/README.md) | `src/lib/lessons.ts`: eager named-key imports of each lesson's summary keys, dynamic import of a whole lesson when its page opens. Lesson JSON plus the shared category registry. | Supplied lesson files (Markdown copies are generated from the JSON by the owner's `generate_lesson.py`). |

Use existing adapters rather than importing the same dataset into new UI components. Preserve API entry IDs, explicit word/phrase kinds, field-level provenance, exact readings, and CDN audio attachments. Vocabulary changes may require rebuilding font subsets; the font coverage tests check this.

Level 2 word recordings are audited/imported separately by `scripts/import-hsk-level2-audio.py` from [the pinned Shtooka/audio-cmn handoff](../../importer/data/hsk-audio/README.md). All 166 eligible entries have recordings; the 13 incompatible readings and 21 missing headwords stay unattached. No example-sentence audio is supplied. The temporary importer MP3s are never browser imports; only verified CDN pointers can become runtime attachments.

Levels 1–4 share the 20-topic taxonomy v1.1.0 defined in the [HSK topic sidecar](../../importer/hsk/hsk3_topics.json). Topic/POS assignments come from their versioned handoffs, with primary topics first in `categoryIds`. Level 2 retains its 196 word and four phrase identities. Levels 3 and 4 add 1,500 separately identified headwords and 3,000 examples; their handoffs are their recorded syllabus sources. All four levels stay draft with unreviewed tokens.

The larger fetched glyph catalogue lives in [public/data/](../../public/data/README.md). Importer-only inputs live in [importer/data/](../../importer/data/README.md). See [catalog.md](../../public/data/catalog.md) for the shared catalogue contract and [scripts/README.md](../../scripts/README.md) for generators.
