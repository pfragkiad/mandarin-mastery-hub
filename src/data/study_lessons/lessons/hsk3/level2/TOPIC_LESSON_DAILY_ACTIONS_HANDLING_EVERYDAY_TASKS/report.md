# Independent lesson authoring / verification report

- Lesson: `topic-helping-with-everyday-tasks` — Helping with Everyday Tasks.
- Source vocabulary: `hsk3_level2_1.1.1.json` (2025-11 syllabus; official IDs preserved), and Level 1 review from `hsk3_level1_1.7.1.json`.
- Core: existing v3.3.0 topic lesson schema; taxonomy v2.0.0. **No changes to Core**.
- Exact introduced Level 2 IDs (8): 305, 329, 334, 338, 405, 418, 437, 456.
- Exact reviewed Level 1 IDs (3): 23, 61, 82.
- Primary topic: `daily-actions`. Lesson subtopic: `physical-actions`. Source item-level taxonomy is preserved exactly.
- The source word-card sentences remain unchanged in the canonical JSON, but are not repeated in rendered HTML/Markdown. Dialogue, reading, patterns, building and speaking content were independently authored for this lesson.
- Teaching sections: four-turn conversation, 2 explained patterns with two worked examples each, 3 guided substitutions, 2 reading paragraphs, 2 comprehension questions, 2 speaking tasks, usage pitfall, pronunciation, review and 5-item quiz (or 4 items where this topic has only 2 introduced words).
- Progress: 15 required checkpoints, 3 optional recall checkpoints. The duration estimate is informational and does not measure progress.
- Catalog: 115 exact mapped characters, missing from external catalog: none.
- Validation: schema draft 2020-12 PASS; `validate_core.py --lesson TOPIC_LESSON_DAILY_ACTIONS_HANDLING_EVERYDAY_TASKS.json --catalog-ids catalog_ids.json` PASS; exact source matching and checkpoint target integrity PASS.
- Editorial status: draft. Naturalness, tone-sandhi and pedagogical level should receive teacher review; automated checks do not certify spoken Mandarin.
