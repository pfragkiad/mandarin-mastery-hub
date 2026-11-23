# Data imported through TypeScript

JSON here is imported by application modules. Static imports make data available with the importing JavaScript; dynamic imports create on-demand chunks. This directory is not private storage: these browser-consumed records are retrievable from the shipped application.

| File or directory | Loading and purpose | Producer |
| --- | --- | --- |
| [vocabulary/](vocabulary/README.md) | Eagerly combined in `src/lib/data-contract.ts` from a shared index and level files into the Mandarin Tutor API shape. Session additions remain separate from imported records. | Original vocabulary export; the five `scripts/import-hsk-level*.mjs` importers use the [versioned handoffs and shared topics](../../importer/hsk/README.md). |
| `radical-contextual-identities.json` | Static import in `src/lib/radical-contextual-identity.ts`. Small reviewed identity subset needed synchronously for exact family/form/glyph presentation. | `scripts/import-radical-contextual-identities.py` extracts recorded fields from the public etymology audit. |
| `supplementary-outlines.json` | Static manifest import in `src/lib/character-enrichment.ts`. Lists covered exact glyphs and public geometry URLs; contains no inferred outlines. | `scripts/import-supplementary-outlines.py`. |
| `finder-missing.json` | Static import in `src/lib/hanzi-finder-records.ts`. Copy of the finder index's `missing` list, so detail cards offer "Find similar" only for glyphs with recorded strokes without fetching the index. | `scripts/build-finder-medians.py` (written with `public/data/finder-medians.json`). |
| `mnemonics.json` | Static import in `src/lib/mnemonics.ts`. Optional alt captions for memory pictures, keyed by the exact lowercase-hex code point of the pointer file name in [src/assets/mnemonics/](../assets/mnemonics/README.md). Memory aids only, never lexical data. | Owner-written captions. |
| `babelstone-components.json` | Dynamic import in `src/lib/babelstone-components.ts`. Resolves numbered source tokens on demand without replacing their source identities. | `scripts/import-babelstone-components.py` reads a supplied IDS source. |
| [pinyin/](pinyin/README.md) | Dynamic imports in `src/lib/pinyin-guide.ts` for the syllable inventory and recording manifest. | `scripts/import-pinyin-audio.py`. |
| [study_lessons/](study_lessons/README.md) | `src/lib/lessons.ts`: eager named-key imports of each lesson's summary keys, dynamic import of a whole lesson when its page opens; `src/lib/lesson-curricula.ts`: course manifests. Lesson JSON plus the shared category registry. | Supplied lesson files (Markdown copies are generated from the JSON by the owner's `generate_lesson.py`). |

Use existing adapters rather than importing the same dataset into new UI components. Preserve API entry IDs, explicit word/phrase kinds, field-level provenance, exact readings, and CDN audio attachments. Vocabulary changes may require rebuilding font subsets; the font coverage tests check this.

Level 2 word recordings are audited/imported separately by `scripts/import-hsk-level2-audio.py` from [the pinned Shtooka/audio-cmn handoff](../../importer/data/hsk-audio/README.md). All 166 eligible entries have recordings; the 13 incompatible readings and 21 missing headwords stay unattached. No example-sentence audio is supplied. The temporary importer MP3s are never browser imports; only verified CDN pointers can become runtime attachments.

Levels 1–4 share the 22-topic taxonomy v2.0.0 defined in the [HSK topic sidecar](../../importer/hsk/hsk3_topics.json). Topic/POS assignments come from their versioned handoffs, with primary topics first in `categoryIds`. The 25 parented subtopics retain their exact source IDs in `studyMetadata.primarySubtopicId`/`subtopicIds`; browser collections remain parent topics. Level 2 retains its 196 word and four phrase identities. Levels 3 and 4 add 1,500 separately identified headwords and 3,000 examples; their handoffs are their recorded syllabus sources. All four levels stay draft with unreviewed tokens.

The larger fetched glyph catalogue lives in [public/data/](../../public/data/README.md). Importer-only inputs live in [importer/data/](../../importer/data/README.md). See [catalog.md](../../public/data/catalog.md) for the shared catalogue contract and [scripts/README.md](../../scripts/README.md) for generators.

Level 5 uses 1,600 draft terms and 3,200 owner-approved rewritten draft examples from the [v1.0.5 handoff](../../importer/hsk/README.md), including 190 revised examples and 69 revised meanings relative to v1.0.1. The compact Level 5 file remains under 10 MB. Level 1 now uses v1.7.1 with 33 revised examples. Readings, meanings, POS, taxonomy and verification limits remain sourced; token alignment does not certify linguistic correctness.

Level 2 now follows v1.1.1: 25 sentence examples updated, including 10 changed Hanzi texts. All lexical fields, word/phrase identities, topics and attached word recordings remain unchanged.

Level 3 follows v1.1.2: 23 revised examples across 21 entries; lexical content, categories, identities and word recordings remain unchanged.

Level 4 follows v1.1.1: 43 revised sentence examples across 38 entries. Lexical content, categories, all 1,000 word IDs and 797 word recordings remain unchanged.

The HSK Level 1 lessons now use the supplied v3.2.0 package and canonical Core v3.2.0 authoring contract: the same 21 lesson IDs and teaching plans, synchronized to all 600 vocabulary v1.7.1 examples. The source ZIPs and importer commands are documented under [lesson handoffs](../../importer/data/lessons/README.md).
