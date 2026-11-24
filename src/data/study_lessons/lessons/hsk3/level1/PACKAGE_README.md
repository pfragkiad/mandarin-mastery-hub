# HSK Level 1 · Core v3.6.1 catalog reference repair

Added 109 verified catalog character references across 20 lessons. All 21 lesson JSON files pass topic lesson schema v3.4.0 and the exact catalog mapping and coverage checks. The original lesson wording, lesson and checkpoint IDs, and teaching assets are preserved. Earlier release notes follow.

# HSK Level 1 · Core v3.6.0

Topic lesson format v3.4.0. 42 approved three-line patterns across 21 topic lessons. The JSON, HTML, and Markdown use the shared Hanzi, pinyin, and pseudo-translation layout. Lesson, vocabulary, and progress identifiers are preserved.

## Earlier release notes

# HSK 3.0 Level 1 lessons — Core v3.3.0, taxonomy v2.0.0, vocabulary v1.7.1

The 21 teaching lessons are synchronized with the 300-word `hsk3_level1_1.7.1.json` source. Each lesson ZIP contains exactly four files: JSON, HTML, Markdown, and `report.md`.

- 33 word-card example sentence records refreshed in 15 lessons; 3 dependent production questions updated.
- The Level 1 curriculum description is learner-facing and does not contain workflow details.
- Progress checkpoint identifiers and required/optional flags are unchanged; only labels for the three updated production questions were refreshed.
- Exception: the source's incorrectly segmented pinyin for `电脑` (`diànnǎo`) was NOT copied; the existing corrected lesson reading was retained.
- Source and editorial audit files are in `audits/` and separate from learner-facing lessons.
- The individual vocabulary source file is not embedded in this lesson archive; source IDs and course placement are preserved.

This replaces `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip`.

## Catalog character-reference repair (rev2)

Restored 43 missing reference mappings across 11 lessons from `catalog_ids.json`. The mappings are regenerated from all learner-visible Mandarin text and validated with the full `validate_core.py --lesson ... --catalog-ids ...` semantic checker. Every original lesson activity, source example and progress checkpoint ID/flag is retained. The repair CSV is in `audits/`.
