# Core package changelog

## Package v3.0.1 — 2026-11-22

- Added the missing reusable `generate_lesson.py` for the v3 schema family.
- Generates synchronized learner-facing HTML and Markdown from canonical v3 lesson JSON.
- Produces the agreed four-file per-lesson ZIP: lesson `.json`, `.html`, `.md`, and independent `report.md`.
- Supports character usage, topic vocabulary, grammar, dialogue, review, and generic lesson types.
- Restores extension tables and historical notes in both character-lesson rendered formats.
- Renders catalog-backed written characters with `data-catalog-id` (no invented URLs), preferring Kai fonts.
- Includes offline, no-CDN presentation and answer-reveal quizzes.
- Keeps curriculum manifests and source provenance outside learner lesson packages.
- **All JSON schema versions stay at `3.0.0`; this patch release changes the bundle's generator and documentation, not the data contract.**

## Package v3.0.0 — 2026-11-22

- Introduced separate course curricula, 20 shared topic categories, optional course-private topics and lesson-independent curriculum placements.
- Added shared classification/tags and typed lesson templates.
- Retained legacy schema snapshots for migration.
