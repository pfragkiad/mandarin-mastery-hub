# Independent character lessons

`CHARACTER_LESSON_CI/` and `CHARACTER_LESSON_YI/` contain the supplied lessons for
次 and 以. Each directory keeps canonical JSON, HTML, Markdown and `report.md`.
`src/lib/lessons.ts` loads the JSON; the companions and reports are offline references.

`python scripts/import-lessons-v3.6.1.py [--write]` validates and copies these
files from the current Other Lessons package. The current package adds eleven three-line constructions across the two lessons;
lesson, construction and checkpoint IDs are preserved.
The lessons remain independent of course placement.

See the [source guide](../../../../../importer/data/lessons/README.md) and
[import audit](../../../../../reports/lessons-3.6.1-import.json).

`pattern_pseudo_translation` is optional on constructions even though the format
version remains `mandarin-character-lesson/3.2.0`. Read the field by presence.
