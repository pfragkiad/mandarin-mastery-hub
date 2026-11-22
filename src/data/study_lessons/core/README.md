# Mandarin Tutor — Core package v3.1.0 (topic teaching schema v3.1.0)

**Purpose:** a multi-course Mandarin learning library that can support HSK 3.0, Pimsleur Mandarin, independent character-usage lessons and future courses without duplicate lesson content.

## The model

- **Lesson**: an independently identifiable teaching object. Stable `lesson_id`, typed content, learning objectives, global topics and tags. Not owned by any course.
- **Global category**: one of the 20 active shared semantic categories in `lesson_categories.json`. Global categories are not lessons or course units.
- **Tag**: unrestricted controlled slug for cross-course discovery. Suitable for `frequency`, `tone-sandhi`, `negation`, etc.
- **Course-private topic**: defined in a particular curriculum manifest, with optional mapping to shared global topics; it must not silently expand the global taxonomy.
- **Curriculum**: HSK, Pimsleur or custom ordered collection of sections → units → placements. Multiple curricula can reference the **same lesson ID**, each in its own position, with its own prerequisites and learning level.
- **HSK vocabulary entry**: an independently identified syllabus item; written Hanzi alone does not uniquely identify its HSK sense/entry. `catalog_character_refs` identifies graphic characters, not word senses or pronunciation.

**Do not encode the sole course ownership or placement as `lesson.course_id`, `lesson.hsk.level`, HSK tags or lesson ID prefix.** `metadata.hsk` is preserved on v3 *character lessons* solely as a character/headword syllabus fact, not as the lesson's curriculum membership. The HSK level studied comes from the course's section placement.

## Core files

| File | Purpose |
| --- | --- |
| `lesson_common.schema.json` | Shared metadata and quiz definitions |
| `character_lesson.schema.json` | Character lessons, supporting old v2.8 and new v3 |
| `CHARACTER_LESSON_TEMPLATE.json`, `.md` | Character authoring templates |
| `topic_lesson.schema.json` | Course-neutral topic/vocabulary lessons v3.0.0 and **teaching v3.1.0** |
| `TOPIC_LESSON_TEMPLATE.json`, `.md` | Topic authoring templates and examples |
| `general_lesson.schema.json` | Typed grammar, dialogue, review or generic lessons |
| `GRAMMAR_…`, `DIALOGUE_…`, `REVIEW_…`, `GENERIC_…` JSON templates | New lesson-type examples |
| `curriculum.schema.json` | Curriculum manifest, sections, units and placements |
| `CURRICULUM_HSK3_TEMPLATE.json` | HSK 3.0 course structure, Levels 1–6 |
| `CURRICULUM_PIMSLEUR_TEMPLATE.json` | Pimsleur study index with private topic taxonomy |
| `lesson_categories.json`, `lesson_categories.schema.json` | 20 shared topics + 2 deprecated migration aliases |
| `validate_core.py` | Schema, quiz, taxonomy, catalog and curriculum checks |
| `generate_lesson.py` | v3 JSON → synchronized HTML, Markdown, and four-file ZIP for character, topic, grammar, dialogue, review, and generic lessons |
| `legacy/…` | Previous schema snapshots for migration |

## New in v3.1.0: lessons that teach, not duplicate cards

The v3.1.0 topic template introduces required `sections.teaching_plan`. It presents, in this order:

1. A situational dialogue of at least four original, contextual turns, each with Chinese, word-separated tone-marked pinyin and English.
2. At least two explained grammar/usage patterns, each supported by two newly authored worked examples.
3. Guided sentence production: one worked model and two controlled substitutions.
4. A coherent reading passage with at least two comprehension checks.
5. At least two open-ended speaking scenarios with suggested model answers.
6. One specific common-pitfall note and pronunciation focus.
7. Applied comprehension/production checks, followed by an optional original vocabulary-recall quiz and a review checklist.

**Do not repeat existing word-card examples on lesson pages.** The canonical JSON retains these source pairs for backwards compatibility; HTML/Markdown shows a compact collapsible word bank with the exact HSK syllabus IDs. This means the lesson is useful even when the user has already studied the individual vocabulary cards.

The v3.1.0 schema is intentionally stricter than v3.0.0; the generator keeps reading prior v3.0.0 topic/character/general lessons. The two independent lessons, 次 (cì) and 以 (yǐ), remain in their specialist character-usage format. The HSK manifest controls order, while shared categories and tags support browsing.

**Scope and quality:** enriched HSK Level 1 lesson content is new draft educational writing (not official examples and not yet native-speaker certified). A JSON Schema pass does not certify tone accuracy, idiomaticity or level compliance; all three still require substantive review.

## Existing lessons and categories

The two existing character lessons remain **independent**: `char-6b21` is 次 (cì) and `char-4ee5` is 以 (yǐ). Both can be referenced from multiple course manifests without copying them.

Suggested classification:

- 次 (cì): primary `numbers-quantities`; additional `time-calendar`; tags `frequency`, `repetition`, `classifiers`, `tone-sandhi`.
- 以 (yǐ): primary `grammar-functions`; additional `time-calendar` when appropriate; tags `lexicalization`, `prepositions`, `formal-register`.

The two former high-level categories `time-frequency-repetition` and `vocabulary-grammar-patterns` are **deprecated**, not deleted, so existing v2.8 lessons remain interpretable. Do not use them on new lessons. Use global categories and narrower tags instead.

## Character IDs and spelling

`catalog_ids.json` stays a **separate authoritative Project Source** (approximately 9.5k characters). Never invent IDs. Build `catalog_character_refs` only from exact single-character matches. Simplified and Traditional characters get their own mapped IDs where supplied. A written character ID must **not** be assumed to determine contextual pinyin, HSK vocabulary identity, or word pronunciation (e.g. 一 [yī] in 一次 [yí cì]). Word-catalog IDs, where available, are separate data.

## Full lesson packaging

Preserve the exact four-root-file contract for a finished lesson: `<LESSON_NAME>.json`, `<LESSON_NAME>.html`, `<LESSON_NAME>.md`, `report.md`. Input reports, source videos, transcripts, provenance and extraction stats belong **only** in `report.md`, not in any learner-facing file. Curriculum manifests are stored separately at the library level and are not one of the four files.

## Migration and rendering

- Do not replace the contents of existing v2.8 lesson JSONs without a content-preserving migration. The v2.8 character and v1.0 topic schemas are saved under `legacy/`.
- Move old `lesson.categories` / `lesson.primary_category_id` / `lesson.tags` to the v3 `classification` object and change `schema_version`, `metadata.template_version`, and `lesson_type` accordingly. For v3, don't keep parallel copies of classification fields inside `lesson`.
- Existing HSK topic lessons organized as one category per lesson should be **re-curated** into smaller lesson units; they are not automatically reclassified as new v3 units.
- The included `generate_lesson.py` renders v3 lesson JSON to synchronized, offline HTML and Markdown and assembles the four-file ZIP. The generator covers the five instructional types plus generic lessons. Curriculum manifests are separate and should be read by your app for course navigation. Legacy v2.x JSON should first be migrated to v3; the new generator does not silently coerce old versions.
- Curriculum identifiers, lesson IDs, topic IDs and optional syllabus IDs are pedagogical identifiers; course-source processing remains in `report.md`.

Run `python validate_core.py --self-test` (requires `jsonschema`). You can validate an authored lesson with `python validate_core.py --lesson lesson.json --schema character_lesson.schema.json --catalog-ids path/to/catalog_ids.json` or validate a course manifest with `--curriculum curriculum.json`.

## v3.1 rendering example

After extracting `core.zip`, keep the `catalog_ids.json` Project Source available at its actual location. For an authored v3 lesson JSON:

```bash
python generate_lesson.py --lesson my_lesson.json --catalog-ids /path/to/catalog_ids.json --report report.md --out-dir ./generated --zip
```

This writes the canonical JSON, HTML and Markdown into `generated/` and a ZIP containing exactly those three files plus `report.md` alongside `generated/`. The `--report` input is deliberately separate. `jsonschema` is required by `validate_core.py`. HTML loads no web fonts or paid/CDN dependencies and prefers system Kai fonts.

**Distribution convention:** `core.zip` contains reusable schemas/templates/tools only; `lessons.zip` contains actual finished lessons plus a curriculum placement manifest. Both use the same v3 schemas and can be versioned separately.
