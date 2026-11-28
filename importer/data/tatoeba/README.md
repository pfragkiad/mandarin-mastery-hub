# Tatoeba Mandarin candidate review

Offline `cmn` (Mandarin Chinese) corpus inputs from the official
[downloads](https://tatoeba.org/en/downloads). Files in this directory are never
loaded by the app. The owner-requested runtime import is generated separately
under `public/data`, with explicit review flags and attribution.

| Path | Purpose / consumer |
| --- | --- |
| `manifest.json` | Public export URLs, acquisition/export timestamps, sizes, SHA-256 hashes and licence notices for the exact local snapshot. |
| `.gitattributes` | Preserves manifest and generated JSONL/TSV bytes across platform checkouts, including bounded part sizes. |
| [raw/](raw/README.md) | Original download bytes; local and excluded from Git. Read by `scripts/prepare-tatoeba.py`. |
| [selected/](selected/README.md) | Exact positive-mark inventory and filtered review spreadsheets, with source text/attribution, reviews/tags, raw pinyin/conversions, direct English links and audio licence metadata. |
| `teaching-excerpts.json` | Individually assistant-checked complete Chinese clauses and matching English spans from reviewed Pass parents; pinned parent hashes, stable excerpt IDs and explicit check authorship. Consumed by `scripts/import-tatoeba-examples.py`, never loaded by the app directly. Only terminal punctuation/capitalization may change. |
| [reports/](reports/README.md) | Owner-created supplied-review directory and consolidated review report for the 375-row OK batch, with consecutive reviewer history and separate proposals and partial Round 3 feedback. Generated/checked by `scripts/reconcile-tatoeba-reviews.py`; no app import or final approval. |

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

Select teaching examples from the 1,224 reviewed first candidates using
`python scripts/import-tatoeba-examples.py --write` (`--check` to verify).
This preserves these inputs and publishes only short Pass examples: at most 20 Han
characters, 40 total Chinese characters and 180 English characters, without unfinished
templates. Unsuitable first choices may use a suitable already-reviewed alternative
or an individually checked bilingual excerpt. Flagged/long candidates remain in
the offline audit; unresolved cases never appear as learner examples. The runtime
sidecar and availability index are version 2. See [the import audit](../../../reports/tatoeba-example-import.md)
and [frontend sentence annotations](../../../public/data/TATOEBA_SENTENCES.md).
Existing vocabulary/lesson sentences stay first; Tatoeba can add another separately
annotated sentence. No recording is attached without exact text and explicit reuse permission.

The offline [Level 6 handoff](../../hsk/hsk3_level6_0.1.0.json) also selects exact
Chinese/direct-English pairs from this checksum-bound snapshot. Each selected
example retains both sentence IDs, authors, links and CC BY 2.0 FR attribution;
assisted sentence pinyin and the conversational/written labels are editorial
drafts. These selections do not change this corpus, its review results or runtime
examples, and are not limited to the separately reviewed positive-only collection.
