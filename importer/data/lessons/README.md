# Lesson source handoffs

Only the current package for each collection is kept here, byte-for-byte. These
are offline importer inputs and are never loaded by the application.

| Source | Purpose / consumer | SHA-256 |
| --- | --- | --- |
| [Mandarin_Core_Project_Sources_v3.4.0_taxonomy-v2.0.0.zip](Mandarin_Core_Project_Sources_v3.4.0_taxonomy-v2.0.0.zip) | Current 20-file Core authoring release: schemas, taxonomy, templates and guides. `scripts/import-lessons-v3.4.0.py` validates the complete active library before copying exact bytes. | `22798e26a7e527626118b20b6c254b90399bc7418850a6e4f1d0b3e82095b851` |
| [Mandarin_Other_Lessons_v3.4.0_taxonomy-v2.0.0_coverage-v1.1.5.zip](Mandarin_Other_Lessons_v3.4.0_taxonomy-v2.0.0_coverage-v1.1.5.zip) | Current 17 conversational lessons plus two independent character lessons, their supplied companions, collection notes and curriculum. Imported without content merging or regeneration. | `4b7d341b8fa0ff314b72bcb090e0c3c39585075479b678c3646ebbeb9e984412` |
| [Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip](Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip) | Current HSK Level 1 source: 21 lessons synced to vocabulary v1.7.1, with repaired catalog references. Retained HSK lessons are checked by the v3.4.0 audit. | `0f7357e1a61d2c5e610ebde6683ae2248a36fa50a1b05d61a92d8a39c23b7f10` |
| [Mandarin_HSK_Level2_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.1.1_rev2.zip](Mandarin_HSK_Level2_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.1.1_rev2.zip) | Current HSK Level 2 source: 25 lessons covering all 200 entries. `scripts/import-hsk-level2-lessons.py` validates exact dictionary examples and course placements. | `ea455614f84e00b1a78366238dd56518b3b59f28d32dc2a80c86ff23826a8ec8` |
| [conversational-mandarin/](conversational-mandarin/README.md) | Original transcript/extraction inputs, separate from current editorial lesson packages. | See its guide. |

From the repository root, using Python with `jsonschema` installed:

```sh
python scripts/import-lessons-v3.4.0.py
python scripts/import-lessons-v3.4.0.py --write --report reports/lessons-3.4.0-import.json
python scripts/import-lessons-v3.4.0.test.py
python scripts/import-hsk-level2-lessons.py
```

Audit is the default; only `--write` applies a fully validated handoff. The v3.4.0
importer stages all output before writing, checks all 65 active lessons and both
curricula, preserves progress identities and copies supplied content exactly.
It does not edit the HSK lessons or runtime vocabulary. Unlinked conversational
expressions are not assigned inferred HSK identities.

The supplied [coverage report](../../../src/data/study_lessons/lessons/conversational/COVERAGE_REPORT.md)
and [source-expression restoration notes](../../../src/data/study_lessons/lessons/conversational/SOURCE_EXPRESSION_RESTORATION_v1.1.5.md)
are retained unchanged with the expression inventories and regional marker sidecar.
These are offline references; importing them does not enable new pronunciation or
regional-marker UI behavior. See the [import audit](../../../reports/lessons-3.4.0-import.json)
and [runtime guide](../../../src/data/study_lessons/README.md).

At the owner's request, superseded ZIPs and obsolete upload Markdown were removed
from the working tree. Their checksums and the Git revision containing the original
files are in the [cleanup record](../../../reports/lessons-3.4.0-source-cleanup.json).
Published history is preserved. The older `import-hsk-level1-lessons.py`,
`import-lesson-core.py` and `import-lessons-v3.3.py` scripts describe historical
migrations and require their original inputs from Git history; do not run them to
apply this release. `import-lessons-v3.3.1.py` is also historical. Historical machine-readable audits remain under `reports/`.
