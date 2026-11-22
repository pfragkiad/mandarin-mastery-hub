# HSK 3.0 Level 2 lessons

Topic lessons for the 200 HSK 3.0 Level 2 words, shown on the Lessons page as their own
course ([curriculum](../../curricula/HSK3_2025_LEVEL2.json), ID `hsk3-2025-level2`), after
the Level 1 course. Each `TOPIC_LESSON_*` directory keeps the four supplied files exactly:
canonical JSON, HTML, Markdown and editorial `report.md`.

| Directory | Lesson | Words |
| --- | --- | --- |
| `TOPIC_LESSON_MAKING_PLANS_TOGETHER/` | Making Plans Together (`topic-making-plans-together`) | Introduces #302, 352, 388, 439, 471, 473, 485, 497, 498; reviews Level 1 #102, 211, 225, 233, 252, 263. |

`src/lib/lessons.ts` reads summary fields eagerly and the full lesson lazily; HTML/Markdown
and reports are not application inputs. Import or audit with
`python scripts/import-hsk-level2-lessons.py [--write]` from the repository root: it checks
every word and example against the runtime Level 1/Level 2 vocabulary, runs the Core
validator, rebuilds the course from its placement table and regenerates `lesson-cards.json`.
New Level 2 packages are added to that table. See the
[source guide](../../../../../../importer/data/lessons/README.md) and
[import audit](../../../../../../reports/hsk-level2-lessons-import.json).
