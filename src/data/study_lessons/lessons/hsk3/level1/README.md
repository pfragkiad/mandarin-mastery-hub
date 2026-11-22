# HSK 3.0 Level 1 lessons

These 21 `TOPIC_LESSON_*` directories are the existing Level 1 lessons, updated
from the owner's v3.2.0 bundle for taxonomy v2.0.0 and vocabulary v1.7.1.
Every directory keeps exactly four supplied files: canonical JSON, HTML, Markdown
and editorial `report.md`. Their original bytes are preserved.

`src/lib/lessons.ts` reads summary fields eagerly and the full lesson lazily.
HTML/Markdown and editorial reports are not application inputs. Course order and
membership stay in [the curriculum](../../curricula/HSK3_2025_LEVEL1.json).

Use `scripts/import-hsk-level1-lessons.py` from the repository root to audit or
import the source ZIP. It validates all 300 exact vocabulary references and 600
word-card examples, catalog identities, subtopic parents and the unchanged lesson
IDs/course/teaching plans before writing. See the
[source guide](../../../../../../importer/data/lessons/README.md) and
[import audit](../../../../../../reports/hsk-level1-lessons-3.2.0-import.json).
