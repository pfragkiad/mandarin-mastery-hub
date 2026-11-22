# HSK Level 1 — catalog reference repair and complete validation

**Date:** 2026-11-22  
**Release:** `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip`  
**Parent release:** `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1.zip`  
**Contract:** lesson v3.3.0 · taxonomy v2.0.0 · vocabulary v1.7.1  

## Root cause

The earlier vocabulary v1.7.1 restoration rewrote sentence text but did not update `catalog_character_refs`. Its checks used JSON Schema and checkpoint integrity only, which do not catch missing catalog links. The project importer correctly rejected 11 affected lessons.

## Verified outcome

- **11 affected lessons repaired**; the other 10 lessons retain complete character mappings.
- **43 missing character references restored**, corresponding to **37 distinct Hanzi**, using only the exact existing IDs from `catalog_ids.json`.
- All **21/21** lesson JSON files pass both the v3.3.0 JSON Schema and the full semantic check (`validate_core.py` with `--catalog-ids`).
- All **300** Level 1 vocabulary IDs are present and all v1.7.1 example records (apart from the documented ID 36 pronunciation exception) match the source.
- Course curriculum identifiers, lesson IDs, checkpoint IDs, optionality, teaching activities, examples, and question texts are unchanged.
- Every nested lesson ZIP has **exactly four root files** (JSON, HTML, Markdown, `report.md`). HTML and Markdown were regenerated deterministically; the accompanying source reports are preserved.
- All outer ZIP files pass integrity tests.

## Repaired lessons

| Lesson archive | Missing character refs | Count |
|---|---|---:|
| `TOPIC_LESSON_ABILITIES_INTERESTS.zip` | 习写字 | 3 |
| `TOPIC_LESSON_BASIC_NEGATION_PARTICLES.zip` | 八半始开点 | 5 |
| `TOPIC_LESSON_CLOCK_AND_DAY.zip` | 生 | 1 |
| `TOPIC_LESSON_DATES_CALENDAR.zip` | 吗师老说请问 | 6 |
| `TOPIC_LESSON_FAMILY_AND_FRIENDS.zip` | 东买八去市星期点西超 | 10 |
| `TOPIC_LESSON_HEALTH_AND_REST.zip` | 们回气热 | 4 |
| `TOPIC_LESSON_PERSONAL_PRONOUNS.zip` | 年 | 1 |
| `TOPIC_LESSON_QUANTITIES_CLASSIFIERS.zip` | 亮他商她家很漂 | 7 |
| `TOPIC_LESSON_QUESTIONS_AND_POINTING.zip` | 们菜 | 2 |
| `TOPIC_LESSON_SHOPPING_AND_THINGS.zip` | 她说问 | 3 |
| `TOPIC_LESSON_STUDYING_AND_LANGUAGE.zip` | 来 | 1 |

## Other packages delivered together

- `Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip` — includes 15 independent Conversational Mandarin lessons; checks confirm the old track note is absent from learner-facing explanations and that labels no longer display `grammar-1`-style identifiers.
- `Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip` — existing 19-source-file Core Rev. 2, with documentation and label guidance. **No JSON Schema change was required for this fix.**

## Required authoring/CI workflow

1. Pin the exact `vocab-vX.Y.Z` source in the release filename and release metadata.
2. After any modification to Chinese vocabulary examples, dialogue, grammar, practice, or teaching-plan text, **rebuild** `catalog_character_refs` from every catalog-resolvable Chinese character in the resulting learner-visible canonical JSON.
3. Look up references **only** in `catalog_ids.json`; never synthesize IDs.
4. Run both the schema check and the complete validator using `--lesson`, `--catalog-ids`, and current Core schema files. The complete checker rejects missing references even when schema validation succeeds.
5. Regenerate HTML and Markdown from canonical JSON, then verify all four individual archive files and curriculum references.
6. Preserve immutable `lesson_id`, checkpoint IDs and optional flags on editorial content refresh; record material changes in separate audit reports.

## Scope and remaining limitations

- This is structural, reference-integrity and source-consistency validation; it is **not** independent native-speaker verification.
- The source v1.7.1 ID 36 `电脑` (diànnǎo) pinyin boundary exception remains documented and intentionally unchanged.
- No Core schema version increment is justified by catalog-table regeneration or lesson editorial fixes.
