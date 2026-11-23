# Independent character lessons

`CHARACTER_LESSON_CI/` and `CHARACTER_LESSON_YI/` contain the supplied lessons for
次 and 以. Each directory keeps canonical JSON, HTML, Markdown and `report.md`.
`src/lib/lessons.ts` loads the JSON; the companions and reports are offline references.

`python scripts/import-lessons-v3.4.0.py [--write]` validates and copies these
files from the current Other Lessons package. The v3.4.0 package's character lesson JSON
content matches the preceding runtime records; IDs and checkpoints are preserved.
The lessons remain independent of course placement.

See the [source guide](../../../../../importer/data/lessons/README.md) and
[import audit](../../../../../reports/lessons-3.4.0-import.json).
