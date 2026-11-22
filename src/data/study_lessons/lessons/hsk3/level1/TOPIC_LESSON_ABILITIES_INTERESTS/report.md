# Current release source synchronization — topic-abilities-interests

- Embedded HSK Level 1 word cards: `hsk3_level1_1.7.1.json` (data version **1.7.1**, 300 syllabus entries).
- Topic taxonomy: `hsk3_topics(2).json` / taxonomy **v2.0.0**.
- Lesson contract: `mandarin-topic-lesson/3.3.0`; stable `lesson_id`, checkpoints, and curriculum placements unchanged.
- Source-card examples updated in this lesson for syllabus IDs: 75, 82, 145.
- Existing corrected segmentation for ID 36 `电脑` retained where applicable.
- The historical input/provenance section below describes the original authoring baseline, **not** the current word-card release.

---

# Content report: What I Can and Want to Do

## Input and provenance

- Source: user-supplied `hsk3_level1_1.6.1(1).json` (HSK 3.0 Level 1, data version 1.6.1).
- Topical taxonomy: user-supplied `hsk3_topics(1).json`; source primary topic IDs were retained in each vocabulary record.
- Character IDs resolved from the shared `catalog_ids.json` (9,537 mappings).
- Vocabulary IDs: 82, 96, 102, 145, 225, 233, 252, 263, 18, 37, 38, 39, 58, 75. The source explicitly states these entry IDs have not been independently certified against the official syllabus.
- This lesson is a curated thematic grouping; its lesson title, objectives, grammar summaries and quizzes are newly authored. It is not an official HSK teaching sequence.
- The example sentences, editorial meanings and pronunciations remain source-derived; these examples are not independently corpus-attested or native-speaker certified.
- Two original examples retained for each of the 14 vocabulary entries, except the documented pinyin-only correction below if applicable.

## Transformation and checks

- Core schema: `mandarin-topic-lesson/3.0.0`.
- Vocabulary introduced: 14; sample sentences: 28; quizzes: 5.
- Boilerplate about dataset editing has been omitted from the learner-visible teaching notes; specific linguistic notes were retained.
- Some notes may require linguistic review. No outside translation/source evidence was invented.
- Every Chinese character used in learner-visible content resolves to a catalog ID.

## v3.1.0 instructional enrichment

- Unit: What I Can and Want to Do (topic-abilities-interests).
- Original vocabulary, meanings, IDs, POS and the two original example sentences per entry have been retained in canonical JSON unchanged. The new lesson renderer displays *references* to vocabulary-detail cards instead of copying those sentences into the main teaching page.
- Newly authored, draft teaching material: a four-turn contextual conversation; two explained grammar patterns with four worked example sentences; a guided sentence-transformation exercise; an original contextual reading and two comprehension checks; two speaking tasks with model responses; a usage pitfall, pronunciation guidance and an exit/review section.
- Original five short word-recall questions preserved as optional practice; four more comprehension/production questions created.
- Quality status: editorial draft only. Native-speaker review, full lexical level audit and final tone/word-segmentation proofreading remain necessary.
- Any references to higher-level vocabulary in newly authored activities are scaffolding, not silently added Level 1 syllabus entries.

## Source-taxonomy synchronization (2026-11-22)
- JSON Schema and Core version unchanged at v3.2.0.
- Shared taxonomy synchronized with user-supplied hsk-topics/2.0.0 (25 active subtopics).
- All original communicative teaching material, stable lesson IDs, and curriculum placements preserved.
- Only topic/subtopic classifications were synchronized. Original word-card example pairs were not rewritten.
- HSK Level 1 entry classifications follow hsk3_level1_1.7.0 source JSON by syllabus ID.
- Classification and teaching-content validation passed.

