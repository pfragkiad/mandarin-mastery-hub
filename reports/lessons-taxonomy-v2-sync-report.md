# Mandarin Tutor — Source Vocabulary & Taxonomy Synchronization

Date: 2026-11-22

## Release identity and version policy

- **Core JSON Schema version: v3.2.0 — unchanged**. This is a registry/data synchronization, not a schema evolution.
- Source topic taxonomy: **hsk-topics/2.0.0** (`hsk3_topics(2).json`).
- Source HSK Level 1 vocabulary: **v1.7.0** (300 entries).
- Source HSK Levels 2–4 vocabulary: **v1.1.0** each (200 + 500 + 1,000 entries).
- Source lesson baseline: `Mandarin_Existing_Lessons_Taxonomy_v3.2.0.zip` (38 lessons).
- Core ZIP: `Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip`.
- HSK ZIP: `Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0.zip`.
- Other changed lessons ZIP: `Mandarin_Other_Lessons_Changes_v3.2.0_taxonomy-v2.0.0.zip`.

## Authoritative topics and compatibility

- 22 active top-level topic IDs; original 20 retained.
- 25 active subtopics and consistent parent topics.
- 2 deprecated original top-level topics retained unchanged.
- Former active subtopic `animals` is now **deprecated** (not deleted); `animals-wildlife` is the replacement active ID.
- The uploaded taxonomy's labels/descriptions and all 25 subtopic relations were copied exactly into `lesson_categories.json`.
- Core includes the same 19 source files as before; only `lesson_categories.json` and the 4 authoring Markdown files changed. Every JSON Schema and JSON template remains byte-identical.
- Core schema, lesson metadata versions and curriculum schema/manifest versions remain unchanged.

## Available lessons

| Group | Existing | Rebuilt with new source | Unchanged |
|---|---:|---:|---:|
| HSK Level 1 enriched topic lessons | 21 | 21 | 0 |
| Conversational Mandarin | 15 | 2 | 13 |
| Independent character lessons | 2 | 0 | 2 |
| **Total** | **38** | **23** | **15** |

HSK Levels 2–4 vocabulary files were verified, but **no completed HSK Level 2–4 teaching lessons** were available for migration and none were invented. No new Level 5 dataset was provided.

## HSK Level 1 vocabulary alignment

- **300/300** syllabus vocabulary IDs matched exactly once across the 21 lessons.
- Preserved headwords, pinyin, meanings, POS tags, original example sentences, teaching notes, dialogue, grammar, reading, speaking, practice and stable lesson IDs.
- `sections.vocabulary.items[].primary_topic_id` added/synchronized in **300** records (it was missing in all 300 previous records).
- `topic_ids` updated in **14** records.
- `primary_subtopic_id` updated in **24** records.
- `subtopic_ids` updated in **26** records.
- The changes.csv within the HSK ZIP records before/after classifications for individual vocabulary items.
- Existing examples appear only in the JSON reference data; the instructional lesson views keep the dialogue/grammar/production/reading/speaking flow.

## Source-example discrepancy retained intentionally

**HSK entry 36**: the uploaded Level 1 v1.7.0 source contains `wǒ zài diànnǎo shàngxué xí.`; the existing lesson already contains the corrected `wǒ zài diànnǎo shàng xuéxí.` for 我在电脑上学习。 (Wǒ zài diànnǎo shàng xuéxí.) — “I study on the computer.” The lesson's correct word segmentation was retained rather than overwritten. The upstream vocabulary source remains unmodified and should be corrected independently. No other source/lesson differences in word-card example Hanzi, pinyin or English were found.

## Lesson-level classification corrections

| Lesson ID | Change |
|---|---|
| `topic-abilities-interests` | Unset invalid `primary_subtopic_id` because its parent was a secondary, not primary, global topic. |
| `topic-animals-and-weather` | Mapped deprecated `animals` → `animals-wildlife`. |
| `topic-getting-around` | Unset invalid `primary_subtopic_id` because its parent was a secondary, not primary, global topic. |
| `topic-questions-and-pointing` | Unset invalid `primary_subtopic_id` because its parent was a secondary, not primary, global topic. |
| `convm-wants-intentions` | Unset invalid `primary_subtopic_id` because its parent was a secondary, not primary, global topic. |
| `convm-food-drinks` | Unset invalid `primary_subtopic_id` because its parent was a secondary, not primary, global topic. |

Only those lesson-level classifications were modified. Vocabulary-item classifications follow the uploaded Level 1 dataset. Two affected Conversational Mandarin lessons are packaged separately; unaffected independent character lessons were not repackaged.

## Validation summary

- All 2,000 source Level 1–4 vocabulary entries have valid active primary and secondary topics, valid subtopic references, unique IDs, and valid parent relationships.
- All 38 existing lessons validate against the unchanged v3.2.0 JSON Schemas and the synchronized registry.
- Strict additional check: when `primary_subtopic_id` is present, its parent must equal `primary_topic_id` (not merely appear among secondary topics).
- For each of 38 lessons, all non-classification fields are deeply equal to the baseline (including teaching content, examples and quiz keys).
- All 21 HSK Level 1 lessons were regenerated from canonical JSON to synchronized HTML and Markdown and repackaged with 4 root files per lesson.
- Both changed Conversational lessons were likewise regenerated; other 15 original lesson archives remain unchanged.
- HSK Level 1 curriculum is byte-identical to the prior manifest and its 21 placements resolve to the same stable lesson IDs.
- `catalog_ids.json` mappings were checked against the existing catalog.
- ZIP integrity verified for all new outer archives and nested lesson packages.
- Taxonomy assignments remain editorial and do not constitute official HSK topic classifications.
