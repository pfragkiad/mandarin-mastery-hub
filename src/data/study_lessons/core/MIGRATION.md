# v2.x / Topic v1 → v3 Migration Rules

This is a **breaking model upgrade**, with schema compatibility for old character lessons.

1. Keep every existing `lesson_id` unchanged (`char-6b21`, `char-4ee5`) and maintain the original pedagogical content.
2. Move `lesson.primary_category_id`, `lesson.categories`, `lesson.tags` into new `classification.primary_topic_id`, `topic_ids`, `tags`. Add `course_topic_refs: []`.
3. Map `time-frequency-repetition` to active `numbers-quantities` or `time-calendar` depending on actual lesson content; preserve the narrower specificity as `frequency` / `repetition` tags.
4. Map `vocabulary-grammar-patterns` to active `grammar-functions` (if appropriate); preserve finer details as tags.
5. Add `lesson_type` (`character_usage`, `topic_vocabulary`, `grammar`, `dialogue`, `review`, or `generic`), and unique learning objectives.
6. Keep each character's `catalog_character_refs` mapped to the external authoritative catalog. Exact IDs, never invented values.
7. For legacy HSK topic JSON, move any `metadata.hsk.level` to curriculum placement/section, not the reusable lesson. Mark introduced/reviewed vocabulary within the new topic lesson as appropriate, rather than silently treating every mentioned word as newly introduced.
8. Place course levels, sessions, units, prerequisite relationships, syllabus entry IDs and lesson sequence in `CURRICULUM_*.json`; never derive a curriculum assignment just from a tag.
9. Retain the four-file lesson ZIP format and separate `report.md` provenance.
10. Re-render HTML/Markdown using an updated v3-aware renderer; legacy generator output is not automatically compatible.

**Naming:** a generic lesson's ID does not contain course sequence. Titles and slugs may change without modifying the stable `lesson_id`.

**Pimsleur:** personal notes may be categorized, but copying and redistributing proprietary full course transcripts or audio requires proper permission/licensing. This core includes no Pimsleur lesson content.

## Rendering after migration

Use the included `generate_lesson.py` rather than the older v2.7 generator. It validates each v3 lesson against its JSON schema and optional catalog IDs before creating HTML/Markdown/ZIP. Preserve independent `report.md` source provenance and keep curriculum placement JSON outside lesson ZIPs.
