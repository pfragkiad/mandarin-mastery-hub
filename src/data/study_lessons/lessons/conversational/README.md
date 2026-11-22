# Conversational Mandarin lessons

15 beginner dialogue lessons organised by communicative topic (greetings, directions, food,
time, money, permission…), built from 16 user-provided audio transcripts. Each
`CONVERSATIONAL_LESSON_*` directory holds the canonical lesson JSON
(`mandarin-general-lesson/3.0.0`, validated with core v3.1.0) plus its generated HTML,
Markdown and editorial `report.md`.

| File | Purpose | Consumer |
| --- | --- | --- |
| `CONVERSATIONAL_LESSON_*/` | One lesson: blocks (intro, model dialogue, two grammar patterns, key expressions) and open-ended practice. | `src/lib/lessons.ts` (summary eagerly, whole file on its page). |
| `TOPIC_LESSON_INDEX.json`, `BROWSE_BY_TOPIC.html` | Supplied topic index and offline browser. | Authoring reference; not loaded. |
| `REPORT.md`, `QUALITY_REPORT.json` | Editorial QA: extraction status counts, corrections, validity policy. | Authoring reference; not loaded. |
| `COLLECTION_README.md`, `PACKAGE_README.md` | Supplied collection and package notes. | Authoring reference; not loaded. |

Course placement lives in [`../curricula/CONVERSATIONAL_MANDARIN.json`](../curricula/CONVERSATIONAL_MANDARIN.json).
The transcripts and the 880-row extraction audit are source material under
[`importer/data/lessons/conversational-mandarin/`](../../../../../importer/data/lessons/conversational-mandarin/README.md), never learner data.
Dialogues are editorial teaching exchanges using source-attested expressions, not verbatim transcripts.
