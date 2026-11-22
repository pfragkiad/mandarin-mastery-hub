# Lesson source handoffs

Owner-supplied source ZIPs are preserved byte-for-byte here. They are offline
authoring inputs and are never loaded by the application.

| Source | Purpose / consumer | SHA-256 |
| --- | --- | --- |
| [Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0_vocab-v1.7.1.zip](Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0_vocab-v1.7.1.zip) | 21 nested four-file lesson packages, unchanged course manifest, source audits and README. `scripts/import-hsk-level1-lessons.py` checks all 300 exact vocabulary identities and 600 examples before updating the existing lesson directories. | `e4f0774372b58ca6f6bb1aa28f099d9dcdf87e3ccb21c97306bc3d3730e8830a` |
| [Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip](Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip) | The canonical 19 schemas, registry, templates and guides. `scripts/import-lesson-core.py` validates all active documents before copying these exact bytes to the core directory. Python tools are separate from Core versioning. | `ff4f2a86ee3f0f073b263e0d6ece1c305320d878069a9cf8d4b58b38a8661a31` |
| [Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip](Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip) | Current Core input: Rev. 2 adds release source-pinning and learner-facing label/copy guidance; JSON Schemas and the category registry are unchanged from v3.3.0. | `cceb74b6f1d10c157db78e3d4105256c6c34100ec018c32734414fe0a2e63cc7` |
| [Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0.zip](Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0.zip) | Core v3.3.0 (checkpoint progress contract): 19 canonical files, copied to the core directory by `scripts/import-lessons-v3.3.py`. | `e0088c00715faeb4dfe7583fd198f1a03bf02282f1f4b5eb16436b213e7bf161` |
| [Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip](Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip) | Current HSK input: vocab v1.7.1 lessons with repaired catalog refs ([repair report](Mandarin_HSK_Level1_Catalog_Reference_Repair_Report_v3.3.0_vocab-v1.7.1_rev2.md)); imported as supplied. | `0f7357e1a61d2c5e610ebde6683ae2248a36fa50a1b05d61a92d8a39c23b7f10` |
| [Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip](Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip) | Current conversational/character input: rewritten intros and learner-facing checkpoint labels; imported as supplied. | `35bd7c5561b3b67a1d823ad04e067da84bf46cb2369d80ef5c889dc371336257` |
| [Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1.zip](Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1.zip) | Superseded by rev2: 21 HSK Level 1 lessons synced to vocab v1.7.1; [its reconciliation report](Mandarin_HSK_Level1_Vocabulary_Regression_Report_v3.3.0_vocab-v1.7.1.md). Its content is taken as supplied; only 43 missing `catalog_character_refs` are added back from the previous files. |
| [Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip](Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip) | Superseded first release: 21 HSK Level 1 lessons with `progress` checkpoints, built from a pre-vocab-v1.7.1 base: the importer keeps the current examples, questions and character refs and takes only the v3.3 fields (see [the regression report](../../../reports/lessons-3.3.0-example-regression.md)). | `fd3a1e9c870d7e0d7b829b4a4b4db55473bf1b8f47853758e262ce32dbd353f0` |
| [Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0.zip](Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0.zip) | 15 conversational + 2 character lessons with checkpoints; curriculum descriptions keep their current learner-facing copy. | `ea113939b3a49cf0239f1181f047e97a634a6b986a331dbb49326d7726f2c6c6` |
| [Mandarin_Progress_Migration_Report_v3.3.0.md](Mandarin_Progress_Migration_Report_v3.3.0.md) | The owner-supplied migration report for the three ZIPs above. | `6befa88693d07458747c5f7336aa8e9e8918e2a5ccf52a495eff6bd6b102ed2f` |
| [conversational-mandarin/](conversational-mandarin/README.md) | Existing dialogue transcripts and extraction audit inputs; independent of the HSK update. | See its guide. |

From the repository root, with Python and `jsonschema` available:

```sh
python scripts/import-lessons-v3.3.py            # current (v3.3.0) handoff: audit; --write applies
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
