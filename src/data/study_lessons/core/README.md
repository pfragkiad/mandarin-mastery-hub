# Mandarin Tutor — Core Project Sources v3.3.1

This **20-file** Project Source package is the **canonical authoring contract and authoring policy release**. The Core package version follows Semantic Versioning; the type-specific JSON Schema versions stay independently pinned. This patch release introduces authoring policy and updates illustrative template copy, **without changing any lesson JSON format or accepting/rejecting any previously valid lessons**.

## Architecture

- **Vocabulary entry:** a syllabus item identified by an exact HSK entry ID and sense; Hanzi alone is not a unique lexical ID.
- **Lesson:** a reusable typed instructional object (`lesson_id` stable across curriculum placements).
- **Curriculum:** an ordered set of course placements (course > level/section > unit > lesson); multiple curricula can place one lesson without duplicating it.
- **Global topic:** one of **22 active top-level categories**. The original 20 IDs are preserved, plus `science-technology` and `society-government-law`.
- **Subtopic:** one of **25 optional hierarchical subdivisions**, with one unambiguous `parent_topic_id` and stable ID. No need to invent subtopics for every topic.
- **Deprecated category:** `time-frequency-repetition` or `vocabulary-grammar-patterns`; preserved for interpreting old lessons, never assigned to new content.
- **Course-private topic:** defined inside a curriculum manifest and optionally mapped to global topics. It does not expand the global registry.
- **Tag:** lightweight cross-course metadata such as `frequency` or `pronunciation`. It does not substitute for topic or curriculum placement.

## Current schema versions

| Contract | Current version | Older versions |
|---|---|---|
| Topic / teaching lesson | `mandarin-topic-lesson/3.3.0` | 3.0.0, 3.1.0, 3.2.0 accepted |
| Character usage lesson | `mandarin-character-lesson/3.2.0` | 3.0.0, 3.1.0 and existing v2 character versions accepted where applicable |
| General / dialogue / grammar / review | `mandarin-general-lesson/3.2.0` | 3.0.0 and 3.1.0 accepted |
| Curriculum | `mandarin-curriculum/3.0.0` | Unchanged |
| Global category registry | 3.2.0 | 22 active top-level, 2 deprecated top-level, 25 active subtopics (plus one deprecated subtopic alias) |

## The 20 Project Source files

Six reusable JSON Schema documents: `lesson_common.schema.json`, `character_lesson.schema.json`, `topic_lesson.schema.json`, `general_lesson.schema.json`, `curriculum.schema.json`, `lesson_categories.schema.json`.

One canonical category registry: `lesson_categories.json`.

Eight JSON authoring templates: `CHARACTER_LESSON_TEMPLATE.json`, `TOPIC_LESSON_TEMPLATE.json`, `DIALOGUE_LESSON_TEMPLATE.json`, `GRAMMAR_LESSON_TEMPLATE.json`, `REVIEW_LESSON_TEMPLATE.json`, `GENERIC_LESSON_TEMPLATE.json`, `CURRICULUM_HSK3_TEMPLATE.json`, `CURRICULUM_CONVERSATIONAL_MANDARIN_TEMPLATE.json`.

Five Markdown authoring guides: `README.md`, `CHARACTER_LESSON_TEMPLATE.md`, `TOPIC_LESSON_TEMPLATE.md`, `GENERAL_LESSON_TEMPLATE.md`, `LESSON_CREATOR_AUTHORING_GUIDELINES.md`.

Python generation and migration tools are shipped **separately**, not as Project Source files, and their revisions do not trigger Core schema versioning.

## Classification rules

Every lesson has at most one primary global topic; `classification.topic_ids` can include meaningful additional topics. Add `classification.primary_subtopic_id` (or `null`) and `classification.subtopic_ids` (possibly empty) when appropriate. If present, the primary subtopic must be listed, and **every** chosen subtopic's parent must be one of `topic_ids`. Subtopics are not POS tags. Unknown or deprecated IDs must not appear in new teaching content. Course-private topics are `course_topic_refs`, not global topics.

Topic lesson vocabulary items also support `primary_subtopic_id` and `subtopic_ids`; preserve their established `topic_ids` and HSK syllabus references. **Do not change headword, original pinyin, examples or source IDs merely because taxonomy changes.**

## Teaching requirements

Topic lessons are **not** displays of the two examples already on each word card. The v3.3.0 topic lesson keeps the v3.1 instructional plan: 4+ situational dialogue turns, at least two explained language patterns and fresh worked examples, guided sentence construction, contextual reading with comprehension, speaking tasks, common pitfalls, pronunciation and review/assessment. The source vocabulary-card examples remain in canonical JSON only for reference and are not duplicated in lesson HTML or Markdown.

Character usage, grammar, dialogue, review and generic lessons retain their specialised teaching structures. Do not manufacture additional material when migrating classifications.

## Chinese writing, integrity and packaging

Provide correct tone-marked pinyin adjacent to Chinese characters; use a local Kai-style font stack for Chinese text. Keep exact graphic character refs from the external `catalog_ids.json` Project Source; do not infer word IDs from character IDs.

Every finished lesson ZIP contains exactly four root-level files: **one canonical JSON, one generated HTML, one generated Markdown and `report.md`**. Input/transcript references and extraction/provenance belong in `report.md` rather than learner JSON/HTML/Markdown.

Global taxonomy and curriculum are orthogonal; HSK, Conversational Mandarin and independent lessons can reuse classifications without owning them. No paid APIs, remotely hosted fonts, proprietary external resources or commercial dependencies are required.

## Migration

The companion taxonomy migration tools release provides an idempotent dry-run/apply migration, HTML/Markdown regeneration, cross-file validation, and a detailed machine-readable classification change report. Historical lessons remain readable by the updated schemas, but **migration of a specific completed lesson is content-preserving**. When an HSK Level 5 source is provided, assign its classifications from this registry rather than creating a competing HSK-specific taxonomy. Existing TXT export formats are unaffected.


## Taxonomy content synchronization — 2026-11-22

The earlier taxonomy-only synchronization left the Core schema at v3.2.0; the new progress contract advances Core to **v3.3.0**. Topic registry data now agrees with the user-provided `hsk3_topics.json` **hsk-topics/2.0.0** (22 active topics and 25 active subtopics). The former `animals` subtopic is retained as deprecated for reading older data; use `animals-wildlife` for newly authored material. The 2 original deprecated top-level categories remain unchanged. The primary subtopic, when non-null, must be a child of the primary topic, not merely a secondary topic. Changing registry contents or generator code does not increment the schema version.

## Independent Conversational Mandarin authoring policy — editorial revision 2

`CURRICULUM_CONVERSATIONAL_MANDARIN_TEMPLATE.json` provides the independent course template.
Use communicative topic inspiration without attributing a lesson to an external course.
Dialogues, grammar explanations, word examples and practice activities are independent editorial materials.
Do not infer a third-party source from shared beginner themes or common phrases.
When direct quotations or licensed sources are actually used, record accurate provenance in the separate `report.md`; do not embed third-party audio or transcripts in finished lesson archives.
That earlier attribution correction was documentation-only; the new v3.3.0 changes JSON Schema for progress checkpoints.

## Checkpoint-based lesson progress (Core v3.3.0)

- Completion is **not time-based**: `progress.tracking_mode = "checkpoints"`. Compute `completed_nonoptional / total_nonoptional`. Optional checkpoints can be shown as bonus work and never block lesson completion. An entire section is complete when all its non-optional checkpoints have been completed.
- Every progress section has a stable `id`, a semantic `section_key`, a `title`, and one or more explicit `checkpoints[]`. Every checkpoint has a permanent `id`, `kind`, learner-facing `label`, and explicit `optional` boolean. When tied to an interactive content item, `target_id` must exactly match its actual item `id`.
- For topic lessons, `sections.teaching_plan.guided_building.substitutions[]` and `sections.teaching_plan.reading.questions[]` now have authored stable `id`s. Keep these IDs and all existing quiz/speaking IDs unchanged when revising/reordering lessons. Never use array position or frontend-generated synthetic progress keys.
- `estimated_minutes` is a **rough informational card estimate**, not a timer, target, or completion metric. Do not infer progress from it.
- The optional `classification.icon_glyph` is one Hanzi character. Otherwise, the frontend should derive its display glyph/theme from the authoritative `primary_topic_id`. Do not put color names or special course-owned categories into the taxonomy.
- The canonical lesson JSON defines the activity checklist **but never contains individual learners' completion state**. Store per-user `{lesson_id, checkpoint_id}` completion records in app storage. Never attach course placement identifiers to reusable lesson IDs.
- Old schema versions remain valid; progress is mandatory for new topic 3.3.0, character 3.2.0, and general 3.2.0.
- Keep the individual lesson four-file ZIP contract: JSON, HTML, Markdown, and standalone `report.md`.

## Core package Semantic Versioning — policy adopted in v3.3.1

- **MAJOR (`X.0.0`)**: incompatible changes to the JSON lesson-format contract or validation semantics that reject previously valid lessons (unless the older formats remain supported).
- **MINOR (`3.X.0`)**: backward-compatible additions to the lesson-format contract, such as new optional fields or new optional sections.
- **PATCH (`3.3.X`)**: no lesson-format contract change; editorial/agent authoring guidelines, documentation, backward-compatible fixes to illustrative template copy, and release-quality guidance.
- Do **not** use `_rev2` suffixes to version Core package releases. Use numbered releases with a changelog.
- Do **not** conflate the Core package release version (now `3.3.1`) with the **embedded type-specific schema versions** (topic `3.3.0`, character/general `3.2.0`, curriculum `3.0.0`), vocabulary releases, or taxonomy releases.
- Generator scripts and tooling remain **outside** the Core Project Sources package; substantive tooling versions can be managed independently.
- Revisions to existing completed lessons must preserve permanent lesson IDs, checkpoint IDs, target IDs and learner progress. An editorial-only Core release does not require re-exporting existing lesson collections.

## Lesson Creator authoring policy

**Mandatory for new lessons and approved editorial revisions:** `LESSON_CREATOR_AUTHORING_GUIDELINES.md` (policy v1.0.0). Read it alongside the applicable schema and template. It governs learner-facing title/subtitle/description, 2–3 content-based tags, metadata placement, natural checkpoint labels, exact vocabulary/source alignment, cross-lesson duplicate sentences, and release validation. Existing lesson JSON files need no migration because this policy does not change their schema.

Template files provide valid examples and structural starting points, not authoritative word-card source data. The illustrative copy and tags in some templates were refreshed in v3.3.1 to align with this policy; the schemas and vocabulary sources remain the authority for field structure and source facts.

## v3.3.1 patch changelog — 2026-11-23

- Added `LESSON_CREATOR_AUTHORING_GUIDELINES.md` (policy v1.0.0), increasing the archive from 19 to 20 files.
- Established package-level Semantic Versioning and clarified its separation from embedded JSON Schema, taxonomy, and vocabulary versions.
- Refined illustrative learner-facing copy, content tags, and checkpoint labels in six JSON authoring templates and updated three type-specific Markdown guides. These are **editorial example changes only**; no property names, schema versions, lesson IDs, question IDs, checkpoint IDs, target IDs or structural definitions changed.
- All six JSON Schema files and `lesson_categories.json` are **byte-for-byte identical to canonical v3.3.0**, with taxonomy v2.0.0 unchanged.
- No completed Level 1, Level 2, Conversational Mandarin or Character lesson packages were changed by this Core release. No taxonomy migration is included.
