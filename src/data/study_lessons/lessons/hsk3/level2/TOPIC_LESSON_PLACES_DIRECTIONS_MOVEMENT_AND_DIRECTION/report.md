# Independent lesson authoring / verification report

- Lesson: `topic-entering-leaving-and-returning` — Entering, Leaving and Returning.
- Source vocabulary: `hsk3_level2_1.1.1.json` (2025-11 syllabus; official IDs preserved), and Level 1 review from `hsk3_level1_1.7.1.json`.
- Core: existing v3.3.0 topic lesson schema; taxonomy v2.0.0. **No changes to Core**.
- Exact introduced Level 2 IDs (15): 316, 318, 320, 347, 348, 350, 361, 362, 370, 372, 373, 425, 427, 458, 460.
- Exact reviewed Level 1 IDs (3): 11, 66, 80.
- Primary topic: `places-directions`. Lesson subtopic: `position-direction`. Source item-level taxonomy is preserved exactly.
- Source word-card sentences are preserved in canonical JSON. Exception: Level 1 ID 36 (电脑) example 1 has an upstream pinyin word-boundary typo, corrected here to `wǒ zài diànnǎo shàng xuéxí.` without changing its Hanzi or English. The source JSON remains unchanged. Dialogue, reading, patterns, building and speaking are independently authored with no exact word-card sentence reuse.
- Teaching sections: four-turn conversation, 2 explained patterns with two worked examples each, 3 guided substitutions, 2 reading paragraphs, 2 comprehension questions, 2 speaking tasks, usage pitfall, pronunciation, review and 5-item quiz (or 4 items where this topic has only 2 introduced words).
- Progress: 15 required checkpoints, 3 optional recall checkpoints. The duration estimate is informational and does not measure progress.
- Catalog: 110 exact mapped characters, missing from external catalog: none.
- Validation: schema draft 2020-12 PASS; `validate_core.py --lesson TOPIC_LESSON_PLACES_DIRECTIONS_MOVEMENT_AND_DIRECTION.json --catalog-ids catalog_ids.json` PASS; exact source matching and checkpoint target integrity PASS.
- Editorial status: draft. Naturalness, tone-sandhi and pedagogical level should receive teacher review; automated checks do not certify spoken Mandarin.
