# Mandarin Tutor — Core Project Sources v3.2.0

This 19-file Project Source package is the **canonical authoring contract**. The Core version tracks JSON Schema/validation changes only, never Python generator changes or lesson-content updates.

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
| Topic / teaching lesson | `mandarin-topic-lesson/3.2.0` | 3.0.0, 3.1.0 accepted |
| Character usage lesson | `mandarin-character-lesson/3.1.0` | 3.0.0 and existing v2 character versions accepted where applicable |
| General / dialogue / grammar / review | `mandarin-general-lesson/3.1.0` | 3.0.0 accepted |
| Curriculum | `mandarin-curriculum/3.0.0` | Unchanged |
| Global category registry | 3.2.0 | 22 active top-level, 2 deprecated top-level, 25 active subtopics (plus one deprecated subtopic alias) |

## The 19 Project Source files

Six reusable JSON Schema documents: `lesson_common.schema.json`, `character_lesson.schema.json`, `topic_lesson.schema.json`, `general_lesson.schema.json`, `curriculum.schema.json`, `lesson_categories.schema.json`.

One canonical category registry: `lesson_categories.json`.

Eight JSON authoring templates: `CHARACTER_LESSON_TEMPLATE.json`, `TOPIC_LESSON_TEMPLATE.json`, `DIALOGUE_LESSON_TEMPLATE.json`, `GRAMMAR_LESSON_TEMPLATE.json`, `REVIEW_LESSON_TEMPLATE.json`, `GENERIC_LESSON_TEMPLATE.json`, `CURRICULUM_HSK3_TEMPLATE.json`, `CURRICULUM_PIMSLEUR_TEMPLATE.json`.

Four Markdown authoring guides: `README.md`, `CHARACTER_LESSON_TEMPLATE.md`, `TOPIC_LESSON_TEMPLATE.md`, `GENERAL_LESSON_TEMPLATE.md`.

Python generation and migration tools are shipped **separately**, not as Project Source files, and their revisions do not trigger Core schema versioning.

## Classification rules

Every lesson has at most one primary global topic; `classification.topic_ids` can include meaningful additional topics. Add `classification.primary_subtopic_id` (or `null`) and `classification.subtopic_ids` (possibly empty) when appropriate. If present, the primary subtopic must be listed, and **every** chosen subtopic's parent must be one of `topic_ids`. Subtopics are not POS tags. Unknown or deprecated IDs must not appear in new teaching content. Course-private topics are `course_topic_refs`, not global topics.

Topic lesson vocabulary items also support `primary_subtopic_id` and `subtopic_ids`; preserve their established `topic_ids` and HSK syllabus references. **Do not change headword, original pinyin, examples or source IDs merely because taxonomy changes.**

## Teaching requirements

Topic lessons are **not** displays of the two examples already on each word card. The v3.2.0 topic lesson keeps the v3.1 instructional plan: 4+ situational dialogue turns, at least two explained language patterns and fresh worked examples, guided sentence construction, contextual reading with comprehension, speaking tasks, common pitfalls, pronunciation and review/assessment. The source vocabulary-card examples remain in canonical JSON only for reference and are not duplicated in lesson HTML or Markdown.

Character usage, grammar, dialogue, review and generic lessons retain their specialised teaching structures. Do not manufacture additional material when migrating classifications.

## Chinese writing, integrity and packaging

Provide correct tone-marked pinyin adjacent to Chinese characters; use a local Kai-style font stack for Chinese text. Keep exact graphic character refs from the external `catalog_ids.json` Project Source; do not infer word IDs from character IDs.

Every finished lesson ZIP contains exactly four root-level files: **one canonical JSON, one generated HTML, one generated Markdown and `report.md`**. Input/transcript references and extraction/provenance belong in `report.md` rather than learner JSON/HTML/Markdown.

Global taxonomy and curriculum are orthogonal; HSK, Pimsleur, Conversational Mandarin and independent lessons can reuse classifications without owning them. No paid APIs, remotely hosted fonts, proprietary external resources or commercial dependencies are required.

## Migration

The companion taxonomy migration tools release provides an idempotent dry-run/apply migration, HTML/Markdown regeneration, cross-file validation, and a detailed machine-readable classification change report. Historical lessons remain readable by the updated schemas, but **migration of a specific completed lesson is content-preserving**. When an HSK Level 5 source is provided, assign its classifications from this registry rather than creating a competing HSK-specific taxonomy. Existing TXT export formats are unaffected.


## Taxonomy content synchronization — 2026-11-22

The JSON Schema contract stays at **Core v3.2.0**. Topic registry data now agrees with the user-provided `hsk3_topics.json` **hsk-topics/2.0.0** (22 active topics and 25 active subtopics). The former `animals` subtopic is retained as deprecated for reading older data; use `animals-wildlife` for newly authored material. The 2 original deprecated top-level categories remain unchanged. The primary subtopic, when non-null, must be a child of the primary topic, not merely a secondary topic. Changing registry contents or generator code does not increment the schema version.
