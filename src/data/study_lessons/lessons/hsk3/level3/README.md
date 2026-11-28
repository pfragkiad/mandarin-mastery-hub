# HSK 3.0 Level 3 lessons

35 topic lessons covering all 500 current official Level 3 entries. JSON is
loaded through `src/lib/lessons.ts`; placements live in
`../../curricula/HSK3_2025_LEVEL1.json`. The original source ZIP remains under
`importer/data/lessons`; `scripts/import-lessons-hsk3.py` validates/imports it.

All reviewed lower-level references and HTML/Markdown labels are normalized to
current official IDs before export. Word, lesson, question and progress UUIDs
remain exact. See the [reference audit](../../../../../../reports/hsk-current-app-references.md)
and the [source import audit](../../../../../../reports/lessons-hsk3-import.json).
