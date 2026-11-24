# Topic lesson v3.3.0 — authoring standard

This template is **course-neutral** and differs from the vocabulary detail card. The lesson must develop a communicative skill rather than repeat the source word list.

- `lesson_type = topic_vocabulary` and `schema_version = mandarin-topic-lesson/3.3.0`.
- Required `sections.teaching_plan`: a contextual dialogue with at least four turns; at least two explained grammar patterns with two new worked sentences each; controlled substitutions; contextual reading with two comprehension questions; at least two speaking tasks; a common pitfall; pronunciation guidance; and review entry IDs.
- `sections.vocabulary.items[].examples` retain the two upstream example pairs **for referential compatibility**, but the generator never displays them in v3.1 learner-facing HTML/Markdown: vocabulary is a compact collapsible index with syllabus IDs. The source cards remain the right place for headword explanations and those examples.
- Use fresh, specific, high-frequency, level-appropriate content. Reuse learned words naturally but avoid mechanically paraphrasing the existing source sentences.
- Write **tone-marked pinyin alongside every Mandarin sentence**, using correct word boundaries and tone sandhi; verify manually. Chinese text uses a local KaiTi-friendly font stack; no embedded or distributed fonts.
- Quiz answers use stable keyed choices (`correct_choice_ids`) and open-ended suggested answers. Comprehension and production are not automatically graded.
- Distinguish new authored material and inherited source examples in `report.md` only. Do not embed provenance in learner JSON/HTML/Markdown.
- Use the exact external `catalog_ids.json` IDs for all known Chinese characters. Do not invent IDs.
- Course membership and ordering belong in separate curriculum manifests, not in the lesson.

## Packaging

Each complete lesson ZIP contains exactly four root files: `TOPIC_LESSON_<NAME>.json`, `TOPIC_LESSON_<NAME>.html`, `TOPIC_LESSON_<NAME>.md`, and `report.md`.

`python generate_lesson.py --lesson path.json --catalog-ids ../catalog_ids.json --out-dir result --report report.md --zip --name TOPIC_LESSON_NAME`

Older v3.0.0 topic JSON remains accepted, but v3.1.0, v3.2.0, and v3.3.0 lessons have the required teaching path. Validators check structure, references and quiz keys, not native-speaker linguistic correctness.


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

## Vocabulary release synchronization and editorial standards

Before publishing, synchronize inherited example records with the exact pinned vocabulary release and audit every newly authored sentence against source-card examples and other lessons. Follow `LESSON_CREATOR_AUTHORING_GUIDELINES.md` for card headers, 2–3 content-based tags, source isolation, and stable checkpoints. Record version/source exceptions in the separate release audit rather than learner-facing lesson content.

Topic lesson format v3.4.0 requires `pattern_hanzi`, `pattern_pinyin`, and `pattern_pseudo_translation` on each teaching pattern. Earlier formats use `formula_en`.
