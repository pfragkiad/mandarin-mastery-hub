# Conversational Mandarin lessons

17 beginner dialogue lessons from the owner-supplied Other Lessons v3.6.0
coverage v1.1.5 editorial release, including phone invitations and newspaper shopping. Each `CONVERSATIONAL_LESSON_*` directory keeps exactly the
supplied JSON (`mandarin-general-lesson/3.4.0`), HTML, Markdown and `report.md`.

| File | Purpose | Consumer / generator |
| --- | --- | --- |
| `CONVERSATIONAL_LESSON_*/` | Canonical lesson, supplied companions and editorial provenance. | `src/lib/lessons.ts` loads summaries and lazy lesson content; companions are not runtime inputs. |
| `TOPIC_LESSON_INDEX.json`, `BROWSE_BY_TOPIC.html` | Supplied topic index and offline browser. | Authoring reference; not loaded by the app. |
| `QUALITY_REPORT.json`, `COVERAGE_REPORT.md`, `COVERAGE_AUDIT.json`, `GRAMMAR_DEDUP_AUDIT.json`, `LINGUISTIC_REVIEW_v1.1.4.md` | Supplied coverage, grammar and linguistic assessments, with review limitations. | Authoring reference; not loaded. |
| `CONVERSATIONAL_EXPRESSION_REVIEW.txt`, `SOURCE_COVERAGE_CROSSWALK.txt` | Supplied 441-expression inventory and 296-source-item crosswalk; permanent CMX IDs retained. | Offline references; not loaded. |
| `EXPRESSION_USAGE_NOTES.tsv`, `SOURCE_EXPRESSION_RESTORATION_v1.1.5.md` | Five exact CMX-bound usage notes and source restoration audit. | Offline references; canonical notes also live in lesson JSON. |
| `REGIONAL_EXPRESSION_MARKERS.json` | 49 supplied expression-specific regional markers. | Offline reference; not currently used by the app. |
| `COLLECTION_README.md`, `PACKAGE_README.md` | Exact supplied collection and outer-package notes. | Authoring reference; not loaded. |

Import/audit with `python scripts/import-lessons-v3.6.1.py [--write]` from the
repository root. The Python importer validates Core, exact catalog references,
checkpoint targets and stable lesson/question identities before copying source
bytes. No lesson text or pinyin is generated, guessed or rewritten during import.

Course placement lives in [the curriculum](../curricula/CONVERSATIONAL_MANDARIN.json).
The [source guide](../../../../../importer/data/lessons/README.md) records current
packages and checksums; the [import audit](../../../../../reports/lessons-3.6.1-import.json)
records validation. The [original transcript/extraction inputs](../../../../../importer/data/lessons/conversational-mandarin/README.md)
remain separate provenance, without implying that editorial teaching dialogues
are verbatim transcripts. The supplied audit does not claim native-speaker certification.

The importer accepts the two supplied appended course units and optional extended
checkpoints while preserving existing lesson, question, checkpoint and placement
identities. Collection sidecars retain their source bytes and are never bundled
into lesson pages.

Core v3.4.0 adds optional `expression_id`, `usage_label` and `usage_note` on
`review_set.items[]`. Five restored source expressions carry these fields. The
exact supplied note TSV and restoration report are offline references; canonical
JSON supplies learner-facing notes. The frontend display update is a separate
handoff. Notes are explanatory text, never pronunciation input. The included
v1.1.4 linguistic audit is explicitly marked historical and superseded for the
five restored forms.

The current package supplies 43 three-line grammar patterns. The additional
`pattern_pseudo_translation` line is display-only. See the supplied
[frontend migration report](../../../../../reports/Frontend_Migration_Report_Core_v3.6.0.md).
