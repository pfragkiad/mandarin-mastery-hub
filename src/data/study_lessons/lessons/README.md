# Lesson documents

Current Core v3.3.2 library: HSK Levels 1–2, Conversational Mandarin and two independent character lessons. Each `*_LESSON_*` directory holds one canonical
lesson JSON plus its generated Markdown/HTML companions and an editorial `report.md`:

| Path | Purpose | Consumer |
| --- | --- | --- |
| `hsk3/level1/TOPIC_LESSON_*/` | 21 HSK 3.0 Level 1 topic lessons (`mandarin-topic-lesson/3.3.0`) with a required `sections.teaching_plan`; 300 syllabus words whose 600 source examples stay in the JSON but are not shown on the lesson page. | `src/lib/lessons.ts` (summary keys eagerly, whole file lazily on its page). |
| `independent/CHARACTER_LESSON_CI/`, `independent/CHARACTER_LESSON_YI/` | Character lessons 次 (cì) and 以 (yǐ), migrated to `mandarin-character-lesson/3.2.0`, IDs unchanged. | `src/lib/lessons.ts`; in no course, so listed under "Independent lessons". |
| [`conversational/`](conversational/README.md) | 15 supplied v3.3.2 editorial lessons, schema `mandarin-general-lesson/3.2.0`. | `src/lib/lessons.ts`; placed by `curricula/CONVERSATIONAL_MANDARIN.json`. |
| [`hsk3/level2/`](hsk3/level2/README.md) | HSK 3.0 Level 2 topic lessons (`mandarin-topic-lesson/3.3.0`), the complete 25-lesson set covering all 200 Level 2 entries, imported by `scripts/import-hsk-level2-lessons.py` (Rev. 2, imported as supplied). | `src/lib/lessons.ts`; placed by the Level 2 section of `curricula/HSK3_2025_LEVEL1.json`. |
| `lesson-cards.json` | Task totals and time per lesson for the index cards, regenerated from every lesson by `scripts/lesson_cards.py`. | `src/lib/lessons.ts`. |
| `curricula/CONVERSATIONAL_MANDARIN.json` | Conversational Mandarin course: one section of 15 topic units, one lesson each, independent of HSK. | `src/lib/lesson-curricula.ts`. |
| `curricula/HSK3_2025_LEVEL1.json` | Course placement manifest: levels → units → placements (lesson ID, order, prerequisites, syllabus entries). | `src/lib/lesson-curricula.ts` (By course view, lesson position). |
| `legacy/` | Pre-v3 copies of the two character lessons, kept for migration only. | Not loaded (excluded from the lesson globs, would duplicate lesson IDs). |
| `manifest.json` | Historical HSK package index; current source packages and versions are recorded in the source handoff guide. | Authoring reference; not loaded. |

Lesson files are discovered by `lessons/**/*_LESSON_*/*.json`. The directory name starts
with the lesson kind (`CHARACTER_`, `WORD_`, `PHRASE_` record a `headword`; `TOPIC_` and
general kinds do not); `lessons.ts` reads `headword` only from those headword kinds, and
`lessons.test.ts` checks every file carries each eagerly read key, because a missing
named key fails the whole app in the browser.

General lessons (`mandarin-general-lesson`) render their recorded `sections.blocks` in order (explanation, dialogue, grammar pattern, review set); their words link only to a unique exact-headword record, and a recording plays only when that record's pinyin matches.

Topic-lesson words link to Vocabulary only through their recorded `syllabus_refs`
(HSK 3.0 entry number) plus the exact headword. Source entry 36's example pinyin was
corrected in the lesson (see its `report.md`) and the same correction is applied to the
Vocabulary word list (`src/data/vocabulary/level-1.json`); the importer source under
`importer/hsk/` is kept byte-for-byte, so a re-import must reapply it.

Use the [core templates](../core/README.md) for new lessons and the
[study lessons guide](../README.md) for IDs, topics and exact record links.

The [current import audit](../../../../reports/lessons-3.3.2-import.json) records
Core/schema, exact HSK dictionary, catalog-reference and checkpoint validation.
`python scripts/import-lessons-v3.3.2.py [--write]` stages the complete replacement
and copies supplied conversational/independent files without content rewriting.
Current packages are in [lesson handoffs](../../../../importer/data/lessons/README.md);
older upload ZIPs and notes are recoverable from Git history.
