# Study lessons

Lesson content for the Lessons pages (`/lessons`, `/lessons/<lesson_id>`), read by
[`src/lib/lessons.ts`](../../lib/lessons.ts).

The current templates and both supplied lessons use `mandarin-character-lesson/2.6.0`.
This version stores learner content only: examples, corpus comparisons and extensions
do not require provenance or verification fields. Editorial references belong in a
separate `report.md` beside each supplied lesson.
Reports are not loaded by the application. Earlier lesson documents may still carry
their recorded inline provenance, which the shared reader continues to support.

See [core/README.md](core/README.md) for schemas and templates and
[lessons/README.md](lessons/README.md) for the supplied lesson directories.

| Path | Purpose | Consumer |
| --- | --- | --- |
| `core/lesson_categories.json` | Shared category registry (`id`, `label`, `description`, `status`). Lessons reference categories by ID; only `active` entries are shown. | Static import in `lessons.ts` (index grouping and filter). |
| `core/lesson_categories.schema.json` | JSON Schema for the registry. | Reference only. |
| `core/character_lesson.schema.json` | JSON Schema for character lessons (`mandarin-character-lesson/2.x`). | Reference; the page types in `lessons.ts` mirror it. |
| `core/CHARACTER_LESSON_TEMPLATE.json` / `.md` | Blank template for new character lessons. | Not loaded. |
| `lessons/<DIR>/<FILE>.json` | One lesson per directory: the canonical lesson. | `lessons.ts`: `lesson_id`, `schema_version`, `lesson`, `metadata` and `headword` are imported eagerly as summaries; the whole file is a lazy chunk loaded by its page. |
| `lessons/<DIR>/<FILE>.md` | Generated from the JSON; same content. | Not loaded. |
| `lessons/<DIR>/<FILE>.html` | Supplied standalone lesson page with quiz interactions. | Open directly in a browser; not loaded by the application. |
| `lessons/<DIR>/report.md` | Supplied source references and editorial provenance, separate from learner content. | Authoring reference; not loaded by the application. |
| `lessons/CHARACTER_LESSON_YI/CHARACTER_LESSON_YI_claude.html` | Design prototype used for ideas only. | Not loaded. |

## Adding a lesson

- Add a new directory under `lessons/` with one JSON file. `lesson_id` must be unique (it is the page address); a duplicate fails the build.
- The schema family in `schema_version` decides the lesson kind: `mandarin-character-lesson` → character, `mandarin-word-lesson` → word, `mandarin-phrase-lesson` → phrase, anything else → topic. A lesson without a `headword` is shown as a topic lesson.
- A character lesson appears on that character's Glyphs card and details only when `metadata.catalog_character_id` equals the record ID (for example `Characters:次`), or, when that is null, when `headword.hanzi` is exactly the record's character.
- Hanzi in lesson fields link to Glyphs or Vocabulary only on an exact written-form match; nothing is inferred.
- v2.6 selection questions record stable `choices[].id` values and `correct_choice_ids`. Each correct ID must refer to a unique choice in that question. Selected answers are revealed from those exact choices; open-ended questions retain their `answer` text. The current reader remains reveal-only.
