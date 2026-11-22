# Lesson source handoffs

Owner-supplied source ZIPs are preserved byte-for-byte here. They are offline
authoring inputs and are never loaded by the application.

| Source | Purpose / consumer | SHA-256 |
| --- | --- | --- |
| [Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0_vocab-v1.7.1.zip](Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0_vocab-v1.7.1.zip) | 21 nested four-file lesson packages, unchanged course manifest, source audits and README. `scripts/import-hsk-level1-lessons.py` checks all 300 exact vocabulary identities and 600 examples before updating the existing lesson directories. | `e4f0774372b58ca6f6bb1aa28f099d9dcdf87e3ccb21c97306bc3d3730e8830a` |
| [Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip](Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip) | The canonical 19 schemas, registry, templates and guides. `scripts/import-lesson-core.py` validates all active documents before copying these exact bytes to the core directory. Python tools are separate from Core versioning. | `ff4f2a86ee3f0f073b263e0d6ece1c305320d878069a9cf8d4b58b38a8661a31` |
| [conversational-mandarin/](conversational-mandarin/README.md) | Existing dialogue transcripts and extraction audit inputs; independent of the HSK update. | See its guide. |

From the repository root, with Python and `jsonschema` available:

```sh
python scripts/import-lesson-core.py
python scripts/import-hsk-level1-lessons.py
# --write applies a fully validated handoff; --report records an optional audit.
python scripts/import-lesson-core.py --write --report reports/lesson-core-3.2.0-import.json
python scripts/import-hsk-level1-lessons.py --write --report reports/hsk-level1-lessons-3.2.0-import.json
python scripts/import-hsk-level1-lessons.test.py
```

The initial import reports describe the old-to-new comparison; repeat audits show
zero changed files/examples. Runtime JSON and supplied companions live under
[study lessons](../../../src/data/study_lessons/README.md); source audits belong
under [reports](../../../reports/README.md). Vocabulary, unrelated lessons, stable
lesson IDs, course order and existing teaching plans remain unchanged.
