# Official HSK advanced vocabulary sources

These are offline inputs for the owner-requested
[`hsk3_level7_0.0.1.json`](../../hsk/hsk3_level7_0.0.1.json) seed. The official
November 2025 syllabus groups **Levels 7–9 together**: 5,600 entries, serials
5401–11000. The requested filename is a local working name; it does not assert
that the official list belongs to Level 7 alone.

| File | Purpose and consumer |
| --- | --- |
| `official-download-page.html` | Anonymous snapshot of the official [HSK website](https://www.chinesetest.cn/), whose HSK 3.0 “Test Syllabus” link identifies the `1219` PDF. |
| `hsk-syllabus-2025-11-official-1219.pdf` | Exact PDF linked by that official page when retrieved on 2026-11-28; 406 PDF pages. |
| `official-syllabus-pages.json` | Page-labelled text extracted from the current official PDF with pypdf 6.21.4, using layout extraction; no OCR or dictionary reconstruction. |
| `hsk-syllabus-2025-11-previous-reference.pdf` | Exact earlier official PDF cited by the existing Level 6 release; 330 PDF pages. Both PDFs identify the November 2025 syllabus edition. |
| `previous-reference-level6-pages.json` | Layout text from PDF pages 94–138 of that earlier PDF, covering all 1,800 Level 6 records. |
| `review-level1-5-previous-pages.json` | Layout text from earlier official PDF pages 9, 20, 21 and 54, supporting the separate [Levels 1–5 report validation](../../../reports/hsk-level1-5-official-id-crosscheck-validation.md). Confirms the five Level 3 POS defects predate the latest numbering and that 白 had a broader POS scope in the earlier PDF. |
| `source-manifest.json` | Retrieval URLs, byte sizes, SHA-256 checksums, PDF versions and extraction details. |
| `official-vocabulary.json` | Generated transcription of all 11,000 current official vocabulary rows, preserving serials, level annotations, homograph suffixes, readings, blank POS fields and source pages. |
| `.gitattributes` | Preserves checksum-bound source bytes and generated JSON line endings. |

The [preparation script](../../../scripts/prepare-hsk-level7.py) parses and checks
all 11,000 serials, then writes the 5,600-entry advanced seed, source audit and
[Level 6 numbering crosswalk](../../../reports/hsk-level6-official-numbering-crosswalk.tsv).
The preserved Level 6 1.0.0 release matches the earlier official PDF exactly. All
1,800 headword/reading/POS tuples also match the current PDF, with 850 serials
renumbered. This source-extraction step changes no runtime data. The separately
approved [1.0.1 migration](../../../reports/hsk-level6-1.0.1-import.json) updates
current official IDs while preserving runtime UUIDs, examples and recordings.

From the repository root:

```sh
python scripts/prepare-hsk-level7.py --write
python scripts/prepare-hsk-level7.py --check
# Optional re-extraction requires pypdf 6.21.4:
python scripts/prepare-hsk-level7.py --extract
```

The seed contains official words, pinyin and raw POS only. English meanings,
topic assignments and examples are pending, and it uses a separate seed schema
so it cannot masquerade as a complete example-pair handoff. See the
[source audit](../../../reports/hsk-level7-0.0.1-official-source-audit.md).
