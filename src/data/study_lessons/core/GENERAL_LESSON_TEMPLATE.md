# General Lesson Types (Grammar / Dialogue / Review) — v3.1.0

Canonical JSON templates: `GRAMMAR_LESSON_TEMPLATE.json`, `DIALOGUE_LESSON_TEMPLATE.json`, `REVIEW_LESSON_TEMPLATE.json`, `GENERIC_LESSON_TEMPLATE.json`.
Each uses `general_lesson.schema.json`. The `lesson_type` controls required block content:

- **grammar**: at least one `grammar_pattern` block with symmetrical punctuation/placeholders in Hanzi and pinyin.
- **dialogue**: at least one two-turn `dialogue` block with explicit speakers, Hanzi, pinyin, and translation.
- **review**: at least one `review_set` block for previously introduced words and structures.
- **generic**: explanation/examples as needed without forced course membership.

Course names and session numbers belong to the **curriculum placement**, not to the reusable lesson ID or `classification.tags`.
For Pimsleur-derived lessons, keep input lesson identifiers, audio/transcript provenance, license and source notices in `report.md`; do not redistribute proprietary transcript/audio without permission.


## Shared taxonomy upgrade — Core v3.2.0

- 22 active global top-level topics, 25 stable optional subtopics and 2 retired-but-readable top-level category IDs.
- Keep permanent lesson IDs and course manifests independent from taxonomy. No new course-specific global category IDs.
- `classification.primary_subtopic_id` (null allowed) and `classification.subtopic_ids` (zero or more) are optional. The primary subtopic must belong to the array. Every selected subtopic must have a parent in `classification.topic_ids`.
- For topic lesson vocabulary items, use the same optional `primary_subtopic_id` and `subtopic_ids` fields; item-level parent topic membership comes from `topic_ids`.
- Subtopics are semantic, not parts of speech; do not guess from character shape or part of speech. Omit uncertain subtopics.
- `lesson_categories.json` is the sole global registry, from which any HSK-specific topic export is derived. Course-private topics remain in their own curriculum manifest.
- `mandarin-topic-lesson/3.2.0`, `mandarin-character-lesson/3.1.0`, `mandarin-general-lesson/3.1.0`; curriculum schema remains `mandarin-curriculum/3.0.0`.
- A migration or a grammar-content edit is not justified by a taxonomy change. All lesson teaching content and pre-existing syllabus IDs must remain unchanged.
- Each nested completed lesson archive still has exactly one canonical JSON, one HTML, one Markdown and one `report.md` in the archive root.
