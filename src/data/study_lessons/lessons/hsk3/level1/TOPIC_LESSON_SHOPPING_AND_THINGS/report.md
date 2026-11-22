# Content report: Buying Everyday Things

## Input and provenance

- Source: user-supplied `hsk3_level1_1.6.1(1).json` (HSK 3.0 Level 1, data version 1.6.1).
- Topical taxonomy: user-supplied `hsk3_topics(1).json`; source primary topic IDs were retained in each vocabulary record.
- Character IDs resolved from the shared `catalog_ids.json` (9,537 mappings).
- Vocabulary IDs: 19, 34, 65, 105, 116, 117, 157, 164, 174, 268, 9, 35, 36, 40, 52, 189, 255, 260, 295. The source explicitly states these entry IDs have not been independently certified against the official syllabus.
- This lesson is a curated thematic grouping; its lesson title, objectives, grammar summaries and quizzes are newly authored. It is not an official HSK teaching sequence.
- The example sentences, editorial meanings and pronunciations remain source-derived; these examples are not independently corpus-attested or native-speaker certified.
- Two original examples retained for each of the 19 vocabulary entries, except the documented pinyin-only correction below if applicable.

## Transformation and checks

- Core schema: `mandarin-topic-lesson/3.0.0`.
- Vocabulary introduced: 19; sample sentences: 38; quizzes: 5.
- Boilerplate about dataset editing has been omitted from the learner-visible teaching notes; specific linguistic notes were retained.
- Some notes may require linguistic review. No outside translation/source evidence was invented.
- Every Chinese character used in learner-visible content resolves to a catalog ID.

## Explicit pinyin correction

- Source entry 36: `我在电脑上学习。` was stored with `wǒ zài diànnǎo shàngxué xí.` and is corrected to `wǒ zài diànnǎo shàng xuéxí.`. The sentence and translation are unchanged.

## v3.1.0 instructional enrichment

- Unit: Buying Everyday Things (topic-shopping-and-things).
- Original vocabulary, meanings, IDs, POS and the two original example sentences per entry have been retained in canonical JSON unchanged. The new lesson renderer displays *references* to vocabulary-detail cards instead of copying those sentences into the main teaching page.
- Newly authored, draft teaching material: a four-turn contextual conversation; two explained grammar patterns with four worked example sentences; a guided sentence-transformation exercise; an original contextual reading and two comprehension checks; two speaking tasks with model responses; a usage pitfall, pronunciation guidance and an exit/review section.
- Original five short word-recall questions preserved as optional practice; four more comprehension/production questions created.
- Quality status: editorial draft only. Native-speaker review, full lexical level audit and final tone/word-segmentation proofreading remain necessary.
- Any references to higher-level vocabulary in newly authored activities are scaffolding, not silently added Level 1 syllabus entries.
