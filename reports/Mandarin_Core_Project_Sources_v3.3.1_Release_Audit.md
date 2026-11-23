# Core Project Sources v3.3.1 — Patch Audit

**Release date:** 2026-11-23  
**Baseline:** Canonical `Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0.zip` (not the unadopted `_rev2` variant).  
**Release:** `Mandarin_Core_Project_Sources_v3.3.1_taxonomy-v2.0.0.zip`.

## Versioning

Package release advanced from **3.3.0 to 3.3.1 (PATCH)**. Embedded JSON Schema contracts are unchanged: topic 3.3.0, character and general 3.2.0, curriculum 3.0.0. Taxonomy v2.0.0 unchanged.

## Contents and delta

**20 files**: 6 unchanged JSON Schemas, 1 unchanged taxonomy registry, 8 JSON templates (six with editorial example-copy updates, two unchanged curriculum templates), 5 Markdown guides (including new guidelines).

**Changed existing files:**

- `CHARACTER_LESSON_TEMPLATE.json`
- `CHARACTER_LESSON_TEMPLATE.md`
- `DIALOGUE_LESSON_TEMPLATE.json`
- `GENERAL_LESSON_TEMPLATE.md`
- `GENERIC_LESSON_TEMPLATE.json`
- `GRAMMAR_LESSON_TEMPLATE.json`
- `README.md`
- `REVIEW_LESSON_TEMPLATE.json`
- `TOPIC_LESSON_TEMPLATE.json`
- `TOPIC_LESSON_TEMPLATE.md`

**Added:** `LESSON_CREATOR_AUTHORING_GUIDELINES.md`.

## Invariants checked

- 6 schema files: exact byte identity against baseline.
- Taxonomy registry: exact byte identity against baseline.
- Two curriculum JSON templates: exact byte identity.
- Six edited JSON lesson templates: same JSON key graph, array shapes, value types, all IDs, schema versions, checkpoint/quiz identity keys, and source examples.
- All 20 packed files match generated content, ZIP CRC test passed.
- No existing completed lessons or saved learner state were touched.

### Important interpretation

Adding tighter editorial authoring requirements to new content does not retroactively invalidate older lessons. If a future change to executable validation rejects previously valid lesson JSON, treat it as a compatibility decision requiring explicit versioning review.

### Source hashes

- Base SHA-256: `e0088c00715faeb4dfe7583fd198f1a03bf02282f1f4b5eb16436b213e7bf161`
- New SHA-256: `69dd542a0273b79f2c98e24c87c0d570861ef2d7ac32719b14d8374950d38502`
