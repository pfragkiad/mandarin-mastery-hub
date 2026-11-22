# General Lesson Types (Grammar / Dialogue / Review) — v3.0.0

Canonical JSON templates: `GRAMMAR_LESSON_TEMPLATE.json`, `DIALOGUE_LESSON_TEMPLATE.json`, `REVIEW_LESSON_TEMPLATE.json`, `GENERIC_LESSON_TEMPLATE.json`.
Each uses `general_lesson.schema.json`. The `lesson_type` controls required block content:

- **grammar**: at least one `grammar_pattern` block with symmetrical punctuation/placeholders in Hanzi and pinyin.
- **dialogue**: at least one two-turn `dialogue` block with explicit speakers, Hanzi, pinyin, and translation.
- **review**: at least one `review_set` block for previously introduced words and structures.
- **generic**: explanation/examples as needed without forced course membership.

Course names and session numbers belong to the **curriculum placement**, not to the reusable lesson ID or `classification.tags`.
For Pimsleur-derived lessons, keep input lesson identifiers, audio/transcript provenance, license and source notices in `report.md`; do not redistribute proprietary transcript/audio without permission.
