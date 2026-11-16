# Lesson schemas and templates

These files support authoring; the shared category registry is the only runtime input
in this directory. See the [study lessons guide](../README.md) for loading and identity rules.

| File | Purpose and consumer |
| --- | --- |
| `character_lesson.schema.json` | Character-lesson JSON Schema, including the current v2.8 format, catalogue character references, explicit quiz choice IDs and legacy fields. Reference for `src/lib/lessons.ts`; it is not loaded by the application. |
| `CHARACTER_LESSON_TEMPLATE.json` | Blank v2.8 authoring template; copy it into a new directory under `../lessons/` and fill in the recorded content. Not loaded at runtime. |
| `CHARACTER_LESSON_TEMPLATE.md` | Markdown companion to the JSON template. Not loaded at runtime. |
| `lesson_categories.json` | Authored category registry, statically imported by `src/lib/lessons.ts` for lesson grouping. |
| `lesson_categories.schema.json` | JSON Schema for the category registry; authoring reference only. |

No repository generator currently produces these files. Keep the JSON and Markdown
templates aligned when editing. Editorial provenance belongs in a separate lesson
`report.md` when supplied, rather than learner content.
