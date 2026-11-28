# Level 6 release inputs

`syllabus-2025-11.json` preserves the exact UTF-8 bytes of the public
[Level 6 transcription](https://github.com/uranbekanarbaev/hsk-3.0-vocabulary-dataset/blob/main/data/by-level/hsk-6.json)
retrieved on 2026-11-28 (Git blob `353902200bb7a08d6e568e173fb8a67da7ed3891`).
It records the 1,800 November 2025 syllabus tuples, IDs 3601–5400, including
the original readings, POS labels, homograph suffixes and PDF page references.
The transcription is by uranbekanarbaev/hsk-3.0-vocabulary-dataset; its source is
the November 2025 HSK examination syllabus linked in the handoff.

`release-1.0.0-revisions.json` freezes the 704 replacement examples and 17
pinyin-only corrections used by [the 1.0.0 handoff](../../hsk/hsk3_level6_1.0.0.json).
It binds the unchanged [0.1.0 baseline](../../hsk/hsk3_level6_0.1.0.json), five
review files and the lexical reading inputs by SHA-256. Its 69 accepted
replacements and 635 newly authored rewrites retain separate review statuses.
All 693 originally flagged examples receive new wording.

`.gitattributes` disables line-ending conversion for these checksum-bound inputs.
They are offline build inputs, never browser data. The
[builder](../../../scripts/build-hsk-level6-release.py) uses only Python's standard
library; frozen text and readings are not regenerated mechanically. It also
generates the [build report](../../../reports/hsk-level6-1.0.0-build.md), audit JSON
and before/after TSV. The [validator](../../../scripts/validate-hsk-level6.mjs)
independently checks source tuples, lexical preservation, review coverage,
taxonomy, provenance and structural pinyin alignment.

From the repository root:

```sh
python scripts/build-hsk-level6-release.py --write
python scripts/build-hsk-level6-release.py --check
node scripts/validate-hsk-level6.mjs
node scripts/validate-hsk-level6.mjs --source importer/hsk/hsk3_level6_0.1.0.json
```

The checks do not certify the transcription, native language review or strict
HSK vocabulary boundaries. Preserve the frozen inputs and historical reviews;
future revisions should use a new versioned manifest.
