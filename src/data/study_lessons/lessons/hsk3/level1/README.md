# HSK 3.0 Level 1 lessons

These 21 `TOPIC_LESSON_*` directories are the existing Level 1 lessons, updated
from the owner's v3.3.0 rev2 bundle for taxonomy v2.0.0 and vocabulary v1.7.1.
Every directory keeps exactly four supplied files: canonical JSON, HTML, Markdown
and editorial `report.md`. Their original bytes are preserved.

`src/lib/lessons.ts` reads summary fields eagerly and the full lesson lazily.
HTML/Markdown and editorial reports are not application inputs. Course order and
membership stay in [the curriculum](../../curricula/HSK3_2025_LEVEL1.json).

The current source ZIP is recorded in the
[source guide](../../../../../../importer/data/lessons/README.md).
`python scripts/import-lessons-v3.4.0.py` audits all retained HSK lessons against
the current Core schemas and exact runtime vocabulary without writing them.
It validates headwords, readings, meanings, examples, catalog identities and
checkpoint targets; see the [current audit](../../../../../../reports/lessons-3.4.0-import.json).
The historical v3.2 importer requires source inputs retained in Git history.
