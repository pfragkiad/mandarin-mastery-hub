# Conversational Mandarin lessons

15 beginner dialogue lessons from the owner-supplied Other Lessons v3.3.1
editorial release. Each `CONVERSATIONAL_LESSON_*` directory keeps exactly the
supplied JSON (`mandarin-general-lesson/3.2.0`), HTML, Markdown and `report.md`.

| File | Purpose | Consumer / generator |
| --- | --- | --- |
| `CONVERSATIONAL_LESSON_*/` | Canonical lesson, supplied companions and editorial provenance. | `src/lib/lessons.ts` loads summaries and lazy lesson content; companions are not runtime inputs. |
| `TOPIC_LESSON_INDEX.json`, `BROWSE_BY_TOPIC.html` | Supplied topic index and offline browser. | Authoring reference; not loaded by the app. |
| `REPORT.md`, `QUALITY_REPORT.json`, `EDITORIAL_AUDIT.md` | Supplied validation and editorial assessments, including review limitations. | Authoring reference; not loaded. |
| `COLLECTION_README.md`, `PACKAGE_README.md` | Exact supplied collection and outer-package notes. | Authoring reference; not loaded. |

Import/audit with `python scripts/import-lessons-v3.3.1.py [--write]` from the
repository root. The Python importer validates Core, exact catalog references,
checkpoint targets and stable lesson/question identities before copying source
bytes. No lesson text or pinyin is generated, guessed or rewritten during import.

Course placement lives in [the curriculum](../curricula/CONVERSATIONAL_MANDARIN.json).
The [source guide](../../../../../importer/data/lessons/README.md) records current
packages and checksums; the [import audit](../../../../../reports/lessons-3.3.1-import.json)
records validation. The [original transcript/extraction inputs](../../../../../importer/data/lessons/conversational-mandarin/README.md)
remain separate provenance, without implying that editorial teaching dialogues
are verbatim transcripts. The supplied audit does not claim native-speaker certification.
