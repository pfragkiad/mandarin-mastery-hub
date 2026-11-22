# HSK Level 2 lesson build and validation report

## Source pinning and package

- Lesson ID: `topic-making-plans-together`; title: Making Plans Together.
- Core schema version: `mandarin-topic-lesson/3.3.0` from existing immutable Core v3.3.0; taxonomy `hsk-topics/2.0.0`.
- **Exact Level 2 source:** `hsk3_level2_1.1.1.json`, data version **1.1.1**, entries 301–500 (200 rows), 2025-11 HSK 3.0 syllabus edition.
- Level 1 prerequisite vocabulary source: `hsk3_level1_1.7.1.json`, data version **1.7.1**, entries 1–300.
- Version 1.1.1 updated 25 entries relative to v1.1.0; this lesson uses 8 of those revised entries: 352, 388, 439, 471, 473, 485, 497, 498. Original example triples are retained exactly.
- Topic lessons are independent authored educational material. Dialogue, patterns, guided building, reading, speaking and assessment are original compositions, not quoted official HSK dialogues or independently certified by native speakers.
- The word-bank original example pairs are embedded only in canonical JSON, not reproduced in learner-facing HTML/MD.

## Content coverage

- Introduced HSK Level 2 entry IDs: 302, 352, 388, 439, 471, 473, 485, 497, 498; **9 new entries**.
- Reviewed HSK Level 1 entry IDs: 225, 233, 102, 263, 252, 211; **6 review entries**.
- Source word-card example pairs: 30, preserved in canonical JSON.
- New situational dialogue: 8 turns.
- New grammar patterns: 4 patterns, 8 worked examples.
- Guided substitutions: 4; contextual reading: 2 paragraphs and 3 comprehension questions.
- Speaking activities: 5; assessment: 8 questions (3 optional recall questions).
- Checklist: **25 required** and **3 optional**, unique stable IDs and exact target IDs. Informational estimate: 35 min, not used for completion.
- All 127 catalog-resolvable written characters are mapped to exact external IDs; unmapped characters: [].

## Mandatory validation

- PASS: `topic_lesson.schema.json` draft 2020-12; required v3.3.0 teaching sections present.
- PASS: `validate_core.py --lesson TOPIC_LESSON_MAKING_PLANS_TOGETHER.json --catalog-ids catalog_ids.json` using canonical Core validator/schema.
- PASS: exact Level 2 and Level 1 upstream vocabulary entry IDs and `hanzi/pinyin/meaning_en/style/register` records, POS and topic/subtopic classifications.
- PASS: active taxonomy parents, subtopic membership, 100% catalog-resolvable character coverage and exact IDs.
- PASS: all progress checkpoint IDs unique; activity target IDs exist; optional recall work excluded from core completion.
- PASS: source examples do not duplicate newly authored teaching sentence examples.
- PASS: HTML/Markdown generated from the canonical JSON; ZIP contains exactly JSON, HTML, Markdown and this report.

## Editorial caveats

- Status remains `draft` until educator/naturalness review; schema validation does not certify idiomatic fluency or voice pronunciation.
- The lesson uses a few transparent, situational expressions (e.g., 踢足球) alongside the exact source-listed vocabulary. These are instructional language, not additional invented HSK word-card entries.
- This is one new standalone lesson and does not alter the existing Asking for Help in Class lesson, curriculum placements, or Core Project Sources.
