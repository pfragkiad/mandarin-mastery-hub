# Study lessons

Lesson content for the Lessons pages (`/lessons`, `/lessons/<lesson_id>`), read by
[`src/lib/lessons.ts`](../../lib/lessons.ts).

The library uses the canonical Core v3.3.2 authoring release: 21 HSK Level 1
and 25 HSK Level 2 topic lessons, 17 conversational lessons and two independent
character lessons (次, 以). Topic schemas remain 3.3.0, character/general schemas
3.2.0 and curricula 3.0.0. Editorial references live in each lesson's `report.md`,
which the app never loads.

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
| `core/*.schema.json`, `core/*_TEMPLATE.*` | Canonical v3.3.2 Core release (topic schema v3.3; character/general v3.2; curriculum v3.0), accepting older lesson versions; `core/legacy/` keeps older versions. | Reference; the page types in `lessons.ts` / `lesson-curricula.ts` mirror them. |
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

## Header copy (lesson creator guideline)

The top of a lesson page shows: course line, lesson type and time, `lesson.title`, `lesson.subtitle`, `lesson.description` and up to three `classification.tags`. Everything there must be about this lesson's content:

- `lesson.subtitle`: a short line naming this lesson's own content (e.g. "Stations, tickets and getting around"), or empty. Never a line shared by a whole course ("Topic-based beginner conversation lesson").
- `lesson.description`: one or two learner-facing sentences starting with a verb ("Learn to start a polite conversation: greet, thank and close a short exchange."). No notes about sources, transcripts, audio tracks, versions or how the lesson was made.
- `classification.tags`: 2–3 short content tags, most important first (`greetings`, `apologies`, `courtesy`). No course, level, audience or format tags (`beginner`, `hsk-level-2`, `topic-lesson`, `topic-study`, `conversational-mandarin`) — the course line already shows those.
- `metadata.audience` is not shown to learners; keep it short if recorded.

Until a package follows this, `src/lib/lesson-header-copy.ts` hides the exact listed boilerplate subtitle, the transcript sentence and course/level/format tags (nothing is rewritten; search still matches the recorded text).

## Current package import

The [source handoff guide](../../../importer/data/lessons/README.md) lists the four
current packages and exact checksums. `scripts/import-lessons-v3.3.2.py` stages and
validates the supplied 20 Core files, 17 conversational lessons, two character
lessons, collection references and conversational curriculum before writing exact
source bytes. The [import audit](../../../reports/lessons-3.3.2-import.json) records
checks for all 65 active lessons, both curricula and recorded HSK dictionary bindings.
No lesson content is generated or repaired during import. HSK lesson content,
runtime vocabulary and saved progress identities are preserved. Superseded source
ZIPs and obsolete upload notes are retained only in Git history; see the source guide.
