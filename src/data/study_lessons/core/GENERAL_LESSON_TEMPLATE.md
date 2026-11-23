# General Lesson Types (Grammar / Dialogue / Review) — v3.2.0

Canonical JSON templates: `GRAMMAR_LESSON_TEMPLATE.json`, `DIALOGUE_LESSON_TEMPLATE.json`, `REVIEW_LESSON_TEMPLATE.json`, `GENERIC_LESSON_TEMPLATE.json`.
Each uses `general_lesson.schema.json`. The `lesson_type` controls required block content:

- **grammar**: at least one `grammar_pattern` block with symmetrical punctuation/placeholders in Hanzi and pinyin.
- **dialogue**: at least one two-turn `dialogue` block with explicit speakers, Hanzi, pinyin, and translation.
- **review**: at least one `review_set` block for previously introduced words and structures.
- **generic**: explanation/examples as needed without forced course membership.

Course names and session numbers belong to the **curriculum placement**, not to the reusable lesson ID or `classification.tags`.
For independently authored conversational lessons, record only actual source use in `report.md`; thematic inspiration does not establish textual or audio provenance. Never redistribute third-party recordings or transcripts as part of a lesson package.


## Shared taxonomy (retained from Core v3.2.0)

- 22 active global top-level topics, 25 stable optional subtopics and 2 retired-but-readable top-level category IDs.
- Keep permanent lesson IDs and course manifests independent from taxonomy. No new course-specific global category IDs.
- `classification.primary_subtopic_id` (null allowed) and `classification.subtopic_ids` (zero or more) are optional. The primary subtopic must belong to the array. Every selected subtopic must have a parent in `classification.topic_ids`.
- For topic lesson vocabulary items, use the same optional `primary_subtopic_id` and `subtopic_ids` fields; item-level parent topic membership comes from `topic_ids`.
- Subtopics are semantic, not parts of speech; do not guess from character shape or part of speech. Omit uncertain subtopics.
- `lesson_categories.json` is the sole global registry, from which any HSK-specific topic export is derived. Course-private topics remain in their own curriculum manifest.
- `mandarin-topic-lesson/3.3.0`, `mandarin-character-lesson/3.2.0`, `mandarin-general-lesson/3.2.0`; curriculum schema remains `mandarin-curriculum/3.0.0`.
- A migration or a grammar-content edit is not justified by a taxonomy change. All lesson teaching content and pre-existing syllabus IDs must remain unchanged.
- Each nested completed lesson archive still has exactly one canonical JSON, one HTML, one Markdown and one `report.md` in the archive root.

## Checkpoint-based lesson progress (Core v3.3.0)

- Completion is **not time-based**: `progress.tracking_mode = "checkpoints"`. Compute `completed_nonoptional / total_nonoptional`. Optional checkpoints can be shown as bonus work and never block lesson completion. An entire section is complete when all its non-optional checkpoints have been completed.
- Every progress section has a stable `id`, a semantic `section_key`, a `title`, and one or more explicit `checkpoints[]`. Every checkpoint has a permanent `id`, `kind`, learner-facing `label`, and explicit `optional` boolean. When tied to an interactive content item, `target_id` must exactly match its actual item `id`.
- For topic lessons, `sections.teaching_plan.guided_building.substitutions[]` and `sections.teaching_plan.reading.questions[]` now have authored stable `id`s. Keep these IDs and all existing quiz/speaking IDs unchanged when revising/reordering lessons. Never use array position or frontend-generated synthetic progress keys.
- `estimated_minutes` is a **rough informational card estimate**, not a timer, target, or completion metric. Do not infer progress from it.
- The optional `classification.icon_glyph` is one Hanzi character. Otherwise, the frontend should derive its display glyph/theme from the authoritative `primary_topic_id`. Do not put color names or special course-owned categories into the taxonomy.
- The canonical lesson JSON defines the activity checklist **but never contains individual learners' completion state**. Store per-user `{lesson_id, checkpoint_id}` completion records in app storage. Never attach course placement identifiers to reusable lesson IDs.
- Old schema versions remain valid; progress is mandatory for new topic 3.3.0, character 3.2.0, and general 3.2.0.
- Keep the individual lesson four-file ZIP contract: JSON, HTML, Markdown, and standalone `report.md`.

## Learner-facing copy and checkpoint labels

Follow `LESSON_CREATOR_AUTHORING_GUIDELINES.md` for title, subtitle, description, tags, and distinct teaching examples. Use natural action descriptions in checkpoint labels; never expose raw activity IDs or source/provenance notes in learner-facing content.
