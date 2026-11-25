# Tatoeba Mandarin candidate review

Offline `cmn` (Mandarin Chinese) corpus inputs from the official
[downloads](https://tatoeba.org/en/downloads). Never loaded by the app and never
treated as approved vocabulary or character examples.

| Path | Purpose / consumer |
| --- | --- |
| `manifest.json` | Public export URLs, acquisition/export timestamps, sizes, SHA-256 hashes and licence notices for the exact local snapshot. |
| `.gitattributes` | Preserves manifest and generated JSONL/TSV bytes across platform checkouts, including bounded part sizes. |
| [raw/](raw/README.md) | Original download bytes; local and excluded from Git. Read by `scripts/prepare-tatoeba.py`. |
| [selected/](selected/README.md) | Exact positive-mark inventory and filtered review spreadsheets, with source text/attribution, reviews/tags, raw pinyin/conversions, direct English links and audio licence metadata. |
| [reports/](reports/README.md) | Owner-created supplied-review directory and owner-requested final report for the 375-row OK batch, with consecutive reviewer history and separate draft corrections for another round. Generated/checked by `scripts/reconcile-tatoeba-reviews.py`; no app import or final approval. |

Run `python scripts/prepare-tatoeba.py --download --check` from the repository root.
Then run `python scripts/prepare-tatoeba.py --filter --write`; verify generated
files with `--filter --check`. Tests: `python scripts/prepare-tatoeba.test.py`.
The [inventory report](../../../reports/tatoeba-positive-inventory.json) records
counts, exclusions, orphan export identities, possible exact-character coverage
and the audio claim audit. The current snapshot is the **21 November 2026** export:
862 present Mandarin sentences tagged OK, 5,518 with +1 ratings (6,251 distinct),
809 eligible OK-tagged and 5,897 eligible positive-marked sentences overall.
These are metadata candidates, not a linguistic quality certification.

An existing download is accepted only with its manifest checksum. Text attribution
must retain individual sentence IDs and contributor names. Audio licences are
separate per recording; this stage downloads metadata only, never media files.
