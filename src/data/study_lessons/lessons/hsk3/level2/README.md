# HSK 3.0 Level 2 lessons

25 topic lessons from the supplied v3.6.1 package, schema
`mandarin-topic-lesson/3.4.0`, with 50 recorded three-line teaching patterns.
Each lesson directory keeps the four exact supplied JSON, HTML, Markdown and
`report.md` files. `PACKAGE_README.md` keeps the supplied outer-package notes.

`src/lib/lessons.ts` reads summaries and lazy lesson content. Companions and reports
are not loaded by the app. Course membership lives in the combined
[curriculum](../../curricula/HSK3_2025_LEVEL1.json).

Run `python scripts/import-lessons-v3.6.1.py [--write]` from the repository root.
The Python importer validates the entire four-package handoff before copying
source bytes, preserving exact vocabulary, catalog, lesson and checkpoint identities.
See the [source guide](../../../../../../importer/data/lessons/README.md),
[import audit](../../../../../../reports/lessons-3.6.1-import.json), and
[frontend handoff](../../../../../../reports/Frontend_Migration_Report_Core_v3.6.0.md).
