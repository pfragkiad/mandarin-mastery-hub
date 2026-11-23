---
schema_version: mandarin-character-lesson/3.2.0
lesson_type: character_usage
lesson_id: char-<lowercase-hex-codepoint>
classification:
  primary_topic_id: grammar-functions
  topic_ids: [grammar-functions]
  tags: [meaning, usage-contrasts]
  course_topic_refs: []
---
# Character Usage Lesson — v3.2.0

Use `CHARACTER_LESSON_TEMPLATE.json` as the canonical source. This Markdown file is an authoring reference, not an independent data store.

## Teaching sections
1. Headword and readings — distinguish pronunciation in words from catalog character identity.
2. Overview and meaning map — usage-based meanings, not forced decomposition.
3. Vocabulary and contrasts — link exact character IDs from `catalog_ids.json`.
4. Construction patterns and natural Mandarin example sentences.
5. Common mistakes and keyed quizzes (`correct_choice_ids`).
6. Optional learner-facing extensions.

## Classification rules
- `lesson_id` stays stable: `char-6b21`, not `hsk3-l2-char-ci`.
- `classification.primary_topic_id` is a shared global topic, or null when unsuitable.
- `classification.topic_ids` contains that primary topic plus optional others.
- `classification.tags` is for narrower concepts such as `frequency`, `tone-sandhi`.
- Curriculum placement belongs in a course manifest, never inside the lesson.
- `metadata.hsk` describes an associated headword/syllabus fact only, **not** lesson ownership or teaching level.

## Packaging
One full lesson ZIP has exactly four root files: `CHARACTER_LESSON_<NAME>.json`, `.html`, `.md` and `report.md`. Keep all report/input provenance in `report.md`, never in learner-facing content.


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

## Authoring policy

For finished lessons, replace illustrative tags with 2–3 specific content tags, use concise action-oriented learner copy, and apply `LESSON_CREATOR_AUTHORING_GUIDELINES.md`. Preserve all existing IDs during editorial revisions.
