# Corrected HSK Level 1 lessons (v3.3.0, vocab v1.7.1) — import check

Date: 2026-11-22. Package: `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1.zip`.

## Fixed — confirmed
- All **600 word-card examples** in the 21 lessons now match the app's Vocabulary word cards exactly (hanzi, pinyin and English). The 33 regressed sentences are back to v1.7.1.
- The **3 production questions** (q-17-5, q-07-5, q-08-5) carry the v1.7.1 prompts and answers; q-08-5's quoting is cleaner than before.
- **Checkpoints unchanged:** 549 required / 64 optional overall, same IDs and optional flags, so saved progress carries over.
- **HSK course description** is learner-facing and is now used as supplied.

## Remaining issue — handled on import
- **43 character links are missing** (`catalog_character_refs`) in 11 lessons: the restored sentences use characters the lesson's link table doesn't list, so the project's lesson checker rejects all 11 files ("missing catalog character references").

| Lesson | Missing characters |
|---|---|
| Abilities & interests | 习 写 字 |
| Basic negation & particles | 八 半 始 开 点 |
| Clock & day | 生 |
| Dates & calendar | 吗 师 老 说 请 问 |
| Family & friends | 东 买 八 去 市 星 期 点 西 超 |
| Health & rest | 们 回 气 热 |
| Personal pronouns | 年 |
| Quantities & classifiers | 亮 他 商 她 家 很 漂 |
| Questions & pointing | 们 菜 |
| Shopping & things | 她 说 问 |
| Studying & language | 来 |

The importer added these back from the previous lesson files (each exactly as listed in `catalog_ids.json`). **For the lesson creator:** regenerate `catalog_character_refs` after changing any sentence, and run the full lesson checker (`validate_core.py --lesson … --catalog-ids …`), not only the JSON Schema.

## Not received yet
The report mentions two more files that were not uploaded:
- `Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip` (conversation lessons with the rewritten intros and checklist labels)
- `Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip` (authoring guidance, rev. 2)

Until they arrive, the 15 conversation lessons still show the old intro text and some internal checklist labels.
