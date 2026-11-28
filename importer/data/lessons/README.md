# Lesson source handoffs

Only the current package for each collection is kept here, byte-for-byte. These
ZIPs are offline importer inputs, not application bundles. All four supplied
packages are imported together by `scripts/import-lessons-v3.6.1.py`.

| Source | Purpose | SHA-256 |
| --- | --- | --- |
| Core: [Mandarin_Core_Project_Sources_v3.6.1_taxonomy-v2.0.0.zip](Mandarin_Core_Project_Sources_v3.6.1_taxonomy-v2.0.0.zip) | 20 canonical Core files; topic/general format 3.4.0, character format 3.2.0. | `4b9009ed9092cba766eaf69b5051498b05ac9f9b6e366753c8d2263a89cae667` |
| HSK Level 1: [Mandarin_HSK_Level1_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.7.1.zip](Mandarin_HSK_Level1_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.7.1.zip) | 21 topic lessons; 42 patterns; repaired exact catalog references. | `e07e82bad82e0a2cd58e652b5cd669456d5188c0641b9802f426b41fed08e571` |
| HSK Level 2: [Mandarin_HSK_Level2_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.1.zip](Mandarin_HSK_Level2_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.1.zip) | 25 topic lessons; 50 patterns; repaired exact catalog references. | `0809cbf7c793d7f2b1deca8aeb25db040e09cef929462661437555b623ae66f4` |
| HSK Level 3: [Mandarin_HSK_Level3_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.3.zip](Mandarin_HSK_Level3_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.3.zip) | 35 topic lessons; 70 patterns; all 500 HSK 3 entries (`501–1000`), imported via `scripts/import-lessons-hsk3.py`. | `7d790b8e396792f7b0fa6221a1c6994abb79ad73ddc0ce7bf50950255778225b` |
| Other Lessons: [Mandarin_Other_Lessons_v3.6.0_taxonomy-v2.0.0.zip](Mandarin_Other_Lessons_v3.6.0_taxonomy-v2.0.0.zip) | 17 conversational lessons with 43 patterns; two character lessons with 11 constructions. | `e54d1a81c68d7c23b2e3287530c00d4f3e6fa80ccad85ba27d031bf29142b636` |

Use Python with `jsonschema` installed, from the repository root:

```sh
python scripts/import-lessons-v3.6.1.py
python scripts/import-lessons-v3.6.1.py --write --report reports/lessons-3.6.1-import.json
python scripts/import-lessons-v3.6.1.test.py
```

Audit is the default. The complete handoff is staged before any runtime write.
Validation covers all 65 lessons, backward compatibility, 574 exact HSK vocabulary
bindings and their examples, catalog references, taxonomy, stable activity and
checkpoint identities, 146 supplied three-line patterns, both course manifests,
and the Level 1 section shared by the standalone and combined HSK manifests.
The combined HSK manifest remains authoritative so importing Level 1 never removes Level 2.
Lesson JSON/HTML/Markdown/report files retain the exact supplied bytes; no lesson
content is generated, guessed, merged or rewritten. The library card sidecar is
regenerated from recorded checkpoints and durations. The original ZIPs also
preserve their bundled authoring audits.

The corrected Core/HSK v3.6.1 packages resolve the v3.6.0 missing-catalog-reference
failures. Other Lessons intentionally remains v3.6.0. See the
[current import audit](../../../reports/lessons-3.6.1-import.json),
[frontend migration report](../../../reports/Frontend_Migration_Report_Core_v3.6.0.md),
and [runtime guide](../../../src/data/study_lessons/README.md).
The [earlier failed audit](../../../reports/lessons-3.6.0-validation.json) is historical;
its source checksums identify the superseded failing packages, not this release.

Superseded uploads and obsolete upload Markdown remain recoverable from Git
history. Older import scripts target historical packages. Original transcript
and extraction inputs remain in [conversational-mandarin/](conversational-mandarin/README.md).
