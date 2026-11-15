# Lesson schemas and templates

These files support authoring; the shared category registry is the only runtime input
in this directory. See the [study lessons guide](../README.md) for loading and identity rules.

| File | Purpose and consumer |
| --- | --- |
| `character_lesson.schema.json` | Character-lesson JSON Schema, including the current content-only v2.5 format and legacy fields. Runtime types in `src/lib/lessons.ts` mirror the schema; it is not loaded by the application. |
| `CHARACTER_LESSON_TEMPLATE.json` | Blank v2.5 authoring template; copy it into a new directory under `../lessons/` and fill in the recorded content. Not loaded at runtime. |
| `CHARACTER_LESSON_TEMPLATE.md` | Markdown companion to the JSON template. Not loaded at runtime. |
| `lesson_categories.json` | Authored category registry, statically imported by `src/lib/lessons.ts` for lesson grouping. |
| `lesson_categories.schema.json` | JSON Schema for the category registry; authoring reference only. |

No repository generator currently produces these files. Keep the JSON and Markdown
templates aligned when editing. v2.5 editorial provenance belongs in a separate lesson
`report.md` when supplied, rather than learner content.
