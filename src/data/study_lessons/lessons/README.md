# Lesson documents

Lessons package v3.0.1 (schema v3.0.0). Each `*_LESSON_*` directory holds one canonical
lesson JSON plus its generated Markdown/HTML companions and an editorial `report.md`:

| Path | Purpose | Consumer |
| --- | --- | --- |
| `hsk3/level1/TOPIC_LESSON_*/` | 21 HSK 3.0 Level 1 topic lessons (`mandarin-topic-lesson/3.0.0`), 300 syllabus words, 600 example sentences. | `src/lib/lessons.ts` (summary keys eagerly, whole file lazily on its page). |
| `independent/CHARACTER_LESSON_CI/`, `independent/CHARACTER_LESSON_YI/` | Character lessons 次 (cì) and 以 (yǐ), migrated to `mandarin-character-lesson/3.0.0`, IDs unchanged. | `src/lib/lessons.ts`; in no course, so listed under "Independent lessons". |
| `curricula/HSK3_2025_LEVEL1.json` | Course placement manifest: levels → units → placements (lesson ID, order, prerequisites, syllabus entries). | `src/lib/lesson-curricula.ts` (By course view, lesson position). |
| `legacy/` | Pre-v3 copies of the two character lessons, kept for migration only. | Not loaded (excluded from the lesson globs, would duplicate lesson IDs). |
| `manifest.json`, `REPORT.md`, `PACKAGE_README.md` | Supplied library index, review status and package notes. | Authoring reference; not loaded. |

Lesson files are discovered by `lessons/**/*_LESSON_*/*.json`. The directory name starts
with the lesson kind (`CHARACTER_`, `WORD_`, `PHRASE_` record a `headword`; `TOPIC_` and
general kinds do not); `lessons.ts` reads `headword` only from those headword kinds, and
`lessons.test.ts` checks every file carries each eagerly read key, because a missing
named key fails the whole app in the browser.

Topic-lesson words link to Vocabulary only through their recorded `syllabus_refs`
(HSK 3.0 entry number) plus the exact headword. Source entry 36's example pinyin was
corrected in the lesson (see its `report.md`) and the same correction is applied to the
Vocabulary word list (`src/data/vocabulary/level-1.json`); the importer source under
`importer/hsk/` is kept byte-for-byte, so a re-import must reapply it.

Use the [core templates](../core/README.md) for new lessons and the
[study lessons guide](../README.md) for IDs, topics and exact record links.
