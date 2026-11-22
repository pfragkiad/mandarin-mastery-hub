# Independent lesson authoring / verification report

- Lesson: `topic-how-are-you-feeling` — How Are You Feeling?.
- Source vocabulary: `hsk3_level2_1.1.1.json` (2025-11 syllabus; official IDs preserved), and Level 1 review from `hsk3_level1_1.7.1.json`.
- Core: existing v3.3.0 topic lesson schema; taxonomy v2.0.0. **No changes to Core**.
- Exact introduced Level 2 IDs (12): 388, 415, 429, 433, 436, 440, 445, 467, 468, 469, 478, 485.
- Exact reviewed Level 1 IDs (3): 12, 100, 104.
- Primary topic: `health-wellbeing`. Lesson subtopic: `None`. Source item-level taxonomy is preserved exactly.
- The source word-card sentences remain unchanged in the canonical JSON, but are not repeated in rendered HTML/Markdown. Dialogue, reading, patterns, building and speaking content were independently authored for this lesson.
- Teaching sections: four-turn conversation, 2 explained patterns with two worked examples each, 3 guided substitutions, 2 reading paragraphs, 2 comprehension questions, 2 speaking tasks, usage pitfall, pronunciation, review and 5-item quiz (or 4 items where this topic has only 2 introduced words).
- Progress: 15 required checkpoints, 3 optional recall checkpoints. The duration estimate is informational and does not measure progress.
- Catalog: 123 exact mapped characters, missing from external catalog: none.
- Validation: schema draft 2020-12 PASS; `validate_core.py --lesson TOPIC_LESSON_HEALTH_WELLBEING.json --catalog-ids catalog_ids.json` PASS; exact source matching and checkpoint target integrity PASS.
- Editorial status: draft. Naturalness, tone-sandhi and pedagogical level should receive teacher review; automated checks do not certify spoken Mandarin.
