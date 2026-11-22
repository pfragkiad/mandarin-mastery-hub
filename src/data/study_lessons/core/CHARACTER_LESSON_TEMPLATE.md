---
schema_version: mandarin-character-lesson/3.0.0
lesson_type: character_usage
lesson_id: char-<lowercase-hex-codepoint>
classification:
  primary_topic_id: grammar-functions
  topic_ids: [grammar-functions]
  tags: [character-usage]
  course_topic_refs: []
---
# Character Usage Lesson — v3.0.0

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
