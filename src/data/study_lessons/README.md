# Study lessons

Lesson content for the Lessons pages (`/lessons`, `/lessons/<lesson_id>`), read by
[`src/lib/lessons.ts`](../../lib/lessons.ts).

The library uses the canonical Core v3.2.0 authoring contract: 21 HSK 3.0 Level 1 topic lessons (schema mandarin-topic-lesson/3.2.0, whose required `sections.teaching_plan` the lesson page renders as its teaching path, with the words as a collapsed word bank) placed by
a course manifest, plus two independent character lessons (次, 以). Learner content only;
editorial references live in each lesson's `report.md`, which the app never loads.

v3 moved topics into `classification` (`primary_topic_id`, `topic_ids`, `tags`) and adds
`lesson_type` and `learning_objectives`; course order lives only in `lessons/curricula/`,
so one lesson can be placed in several courses (HSK, later Pimsleur or custom) without
copying it. Character lessons keep `metadata.catalog_character_id` and the lesson-wide
`catalog_character_refs` map to IDs from [catalog_ids.json](../../../public/data/catalog_ids.json).

See [core/README.md](core/README.md) for schemas and templates and
[lessons/README.md](lessons/README.md) for the supplied lesson directories.

| Path | Purpose | Consumer |
| --- | --- | --- |
| `core/lesson_categories.json` | Canonical registry with 22 active parent topics, 25 active subtopics and deprecated aliases (`kind`, `parent_topic_id`, `status`). Top-level lesson discovery uses active parents only; recorded subtopic IDs stay attached to each lesson/word. | Static import in `lessons.ts` (By topic grouping and filter). |
| `core/lesson_categories.schema.json` | JSON Schema for the registry. | Reference only. |
| `core/*.schema.json`, `core/*_TEMPLATE.*` | Canonical v3.2 Core schemas/templates (topic v3.2; character/general v3.1; curriculum v3.0), accepting older lesson versions; `core/legacy/` keeps older versions. | Reference; the page types in `lessons.ts` / `lesson-curricula.ts` mirror them. |
| `core/generate_lesson.py`, `core/validate_core.py` | Separately maintained generator and validator for the Markdown/HTML companions; see core/TOOLS.md. | Authoring tools; not loaded. |
| `lessons/**/<KIND>_LESSON_<KEY>/<FILE>.json` | One lesson per directory: the canonical lesson. | `lessons.ts`: `lesson_id`, `schema_version`, `lesson_type`, `lesson`, `classification`, `learning_objectives`, `metadata`, `catalog_character_refs` (and `headword` for headword kinds) eagerly as summaries; the whole file lazily on its page. |
| `lessons/curricula/*.json` | Course manifests (levels, units, placements, prerequisites). | `lesson-curricula.ts`. |
| `lessons/**/<FILE>.md`, `.html`, `report.md` | Generated companions and editorial provenance. | Not loaded. |

See [lessons/README.md](lessons/README.md) for the directories.

## Adding a lesson

- Add a new `<KIND>_LESSON_<KEY>` directory under `lessons/` (inside its course folder or `independent/`) with one JSON file, and place it in a course by adding a placement to that course's manifest in `lessons/curricula/`. `lesson_id` must be unique (it is the page address); a duplicate fails the build.
- The schema family in `schema_version` decides the lesson kind: `mandarin-character-lesson` → character, `mandarin-word-lesson` → word, `mandarin-phrase-lesson` → phrase, `mandarin-topic-lesson` → topic. A lesson without a `headword` is shown as a topic lesson.
- A character lesson appears on that character's Glyphs card and details only when `metadata.catalog_character_id` equals the record ID (for example `Characters:次`), or, when that is null, when `headword.hanzi` is exactly the record's character.
- Hanzi in lesson fields link to Glyphs or Vocabulary only on an exact written-form match; nothing is inferred.
- Selection questions record stable `choices[].id` values and `correct_choice_ids`. Each correct ID must refer to a unique choice in that question. The application grades selections only against validated recorded IDs; open-ended and legacy questions retain their reference-answer behavior.

## Current Level 1 package

The [source handoff guide](../../../importer/data/lessons/README.md) records both supplied ZIPs and checksums. All 19 Core Project Sources are copied byte-for-byte from the owner’s v3.2.0 contract. The Level 1 package updates 33 word-card examples, three quizzes and taxonomy fields, while retaining the same 21 lesson IDs, curriculum order and teaching plans. All 300 syllabus references and 600 examples match runtime vocabulary v1.7.1, including the approved entry 36 pinyin spacing correction. Independent and Conversational Mandarin lesson files remain unchanged.

The [lesson import audit](../../../reports/hsk-level1-lessons-3.2.0-import.json) and [Core cross-check](../../../reports/lesson-core-3.2.0-import.json) record validation. Supplied HTML/Markdown companions are retained, without regeneration or vocabulary edits.
