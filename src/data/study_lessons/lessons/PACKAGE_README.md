# Mandarin learning library — lessons package v3.0.1 (schema v3.0.0)

This archive contains the **actual learner content**, organized independently of the reusable `core.zip` schemas and renderer.

- 21 HSK 3.0 Level 1 topic lessons, reorganized by learning objective rather than one lesson per taxonomy category.
- 300 source entries introduced once, with 600 source example sentences and newly authored exercises.
- 2 independent character-usage lessons: 次 (cì) and 以 (yǐ), with their pre-existing lesson IDs retained.
- One HSK 3.0 Level 1 curriculum placement manifest for navigation, sequence, prerequisites, and syllabus-entry coverage.

## Layout

- `hsk3/level1/*.zip`: Each lesson ZIP has exactly four root-level files: JSON, HTML, Markdown, `report.md`.
- `independent/*.zip`: Same four-file format for independent character lessons.
- `curricula/HSK3_2025_LEVEL1.json`: shared curriculum manifest, separate from learner content.
- `manifest.json`: machine-readable lesson library index.
- `REPORT.md`: dataset review status and migration summary.

**The catalog is external.** Use the authoritative project `catalog_ids.json`, not a copied catalog. Every known written character is mapped to its exact ID.

The HSK 3.0 Level 1 lesson IDs are course-independent, so they may later be reused in another curriculum.

The 21 proposed lessons are editorial groups, not an official HSK learning order. Source example pinyin and translations have not been independently native-speaker certified. An overt pinyin segmentation error in source entry 36 is corrected and recorded in that lesson's `report.md`.

To regenerate or validate content using the same contracts, use `core.zip` v3.0.1 (`generate_lesson.py` and `validate_core.py`).
