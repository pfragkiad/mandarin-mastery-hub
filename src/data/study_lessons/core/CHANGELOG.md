# Core changelog

## 3.2.0 — 2026-11-22
- Synced `lesson_categories.json` (registry 3.2.0) with the owner-supplied hsk-topics/2.0.0: 22 active top-level topics (original 20 plus `science-technology`, `society-government-law`), 25 active subtopics with one `parent_topic_id` each, two deprecated top-level aliases and the deprecated subtopic `animals` (replaced by `animals-wildlife`).
- Added optional `primary_subtopic_id` / `subtopic_ids` to lesson classification and topic-lesson vocabulary items; schemas now `mandarin-topic-lesson/3.2.0`, `mandarin-character-lesson/3.1.0`, `mandarin-general-lesson/3.1.0`, older v3 versions accepted.
- Lessons: 21 HSK Level 1 topic lessons and two Conversational lessons reclassified only; all teaching content, IDs and course placements unchanged. See [the sync report](../../../../reports/lessons-taxonomy-v2-sync-report.md).

## 3.1.0 — 2026-11-22
- Added `sections.teaching_plan` for instructional topic lessons: original dialogues, explained grammar patterns, guided substitutions, contextual reading/comprehension, speaking practice, pitfalls, pronunciation notes and review.
- Made these sections **mandatory for `mandarin-topic-lesson/3.1.0`**, retaining support for `3.0.0` topic lessons and unchanged `3.0.0` character/general lessons.
- Updated `generate_lesson.py`: renders the instructional sequence first; hides duplicate source vocabulary-card examples in the lesson page; exposes referenced vocabulary in a collapsed index.
- Added stronger v3.1 semantic checks for review IDs, nonempty dialogue and quiz IDs, and unique module IDs.
- Updated the reference topic template and documentation.

## 3.0.1 — 2026-11-22
- Added deterministic HTML/Markdown renderer and documentation corrections.

## 3.0.0 — 2026-11-22
- Introduced multi-course shared classification, curricula and independent lessons.
