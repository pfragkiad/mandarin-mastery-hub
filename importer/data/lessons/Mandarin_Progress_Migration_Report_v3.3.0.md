# Mandarin Tutor — checkpoint-based progress migration

Date: 2026-11-22. **Core schema release: v3.3.0**. Topic: 3.2.0 → 3.3.0, character: 3.1.0 → 3.2.0, general: 3.1.0 → 3.2.0; curriculum schema: 3.0.0 unchanged; topic taxonomy v2.0.0 unchanged.

## Scope
- 21 HSK Level 1 teaching lessons, 15 independent Conversational Mandarin lessons, 2 independent character lessons — **38/38** migrated and validated.
- No HSK teaching lessons for Levels 2–4 were among the current course files. Vocabulary datasets and curriculum IDs were not modified.
- All existing teaching text and structure were preserved, with only new reading-question / substitution IDs, progression metadata and schema identifiers added. All four files in each individual lesson ZIP remain: JSON, generated HTML, generated Markdown, `report.md`.
- Original curriculum placement manifests and offline browser retained; lesson checklist data is authored in JSON and shown in newly generated reader files.
- Core is still exactly 19 files. All text and filename references to the third-party course named in the previous discussion were removed/absent (case-insensitive scan).

## Progress contract
- `progress.tracking_mode = "checkpoints"`. `progress.sections[]` enumerates the exact sections and checkpoints, with persistent `id`, `kind`, `label`, `optional`, and when applicable `target_id` pointing to the stable ID on the actual activity.
- Every topic lesson's guided substitutions and reading comprehension questions have new direct IDs; existing speaking/question/block IDs are retained.
- Core completion = completed *nonoptional* checkpoint IDs / all nonoptional checkpoint IDs. Optional vocabulary-recall selection quizzes in HSK lessons are bonuses. All completed state belongs in external frontend/user storage, never inside lesson JSON.
- `estimated_minutes` is an optional informational estimate displayed on cards; never calculate progress from it. Initial editorial defaults: 25 for HSK topic teaching, 15 for conversational dialogues, 20 for character deep-dives. These are not observed durations.
- `classification.icon_glyph` is supported as an optional single Hanzi override; absent means use default glyph/theme from `primary_topic_id`. No changes to existing topic assignments or visual theme rules.

## Verification
- Updated draft-2020-12 JSON Schemas parsed and validated.
- All migrated lessons passed JSON Schema and progress reference checks.
- Original lesson JSON unchanged after stripping new progress, estimated minutes, new direct activity IDs and schema version values.
- All 38 lesson packages contain exactly four root-level files, including independent `report.md`.
- No curriculum placements, HSK IDs, vocabulary examples or authored instructional content replaced.
- Full UI integration still requires consuming `progress.sections` and saving completion by `lesson_id` + `checkpoint.id`. Static HTML/Markdown display the checklist identifiers but do not persist user progress.

## Files
- `Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0.zip`
- `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip`
- `Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0.zip`

## Counts and reader checks
- HSK: 21 lessons, 189 progress sections, 378 required checkpoints, 63 optional checkpoints.
- Other: 17 lessons, 106 progress sections, 171 required checkpoints, 1 optional checkpoint.
- **Overall: 38 lessons, 295 progress sections, 549 required and 64 optional checkpoints**.
- All 38 generated HTML and Markdown files include the authored progress checklist. Topic HTML was specifically checked to use the full dialogue/pattern/building/reading/speaking teaching renderer, not the older vocabulary-only renderer.
- Prior 36 topic/general lessons validated against the new schemas without migration (backward compatibility); the prior character schema versions also remain included in the character schema enumeration.
- Schema validation rejects a missing reading-question ID for new v3.3.0 topic lessons.
