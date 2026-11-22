# Core changelog

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
