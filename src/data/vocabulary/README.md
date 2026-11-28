# Vocabulary data

The split files contain the browser-consumed Mandarin Tutor vocabulary. `index.json`
holds shared categories, other top-level metadata, and the ordered part filenames.
`level-1.json` through `level-5.json` and the two `level-6-part-*.json` files hold the corresponding HSK entries;
`unlevelled.json` holds entries without a level. When levels are interleaved,
the index also records `entryOrder` as exact entry IDs. This split follows the
recorded `hskLevel`, not whether a source is official.

`src/lib/data-contract.ts` eagerly combines the parts into the existing API shape.
The HSK and audio importers use `scripts/vocabulary-store.mjs` or
`scripts/vocabulary_store.py` to read and write the same shape. A `.json` path
passed to an importer remains a single combined file. Preserve record IDs,
source metadata, examples, and CDN audio attachments when updating the data.
See the [HSK handoff guide](../../../importer/hsk/README.md) and
[importer guide](../../../scripts/README.md).

Levels 1–4 use editorial topic taxonomy v2.0.0 (22 parent collections). Exact
primary/secondary subtopic IDs are retained in `studyMetadata` alongside the
version and source checksum. The [migration audit](../../../reports/hsk-topics-v2-import.json)
records classification changes and preservation checks for all 2,000 entries.

`level-1.json` now follows v1.7.1, including 33 revised sentence examples.
`level-5.json` now follows v1.0.5: 1,600 draft terms and 3,200 draft examples.
Relative to v1.0.1, 190 examples and 69 meanings are revised. The initial v1.0.0 sentence deferral is historical.
All source verification limits, exact word IDs, compatible recordings and original
syllabus provenance remain attached. Optional terms-only imports preserve existing
examples; normal imports use the current source examples.

Level 5 word recordings are on the Lovable CDN: all 1,306 exact word/reading
matches are attached (42 different recorded readings and 252 missing words stay
without audio; see the [Level 5 audio report](../../../reports/hsk-level5-audio.md)).
Draft example sentences have no recordings. No local media paths are runtime audio
attachments. See the [Level 1 audit](../../../reports/hsk-level1-1.7.1-import.json)
and [Level 5 audit](../../../reports/hsk-level5-1.0.5-import.json).

`level-2.json` follows v1.1.1, with 25 updated examples (10 changed sentence texts
and 15 pinyin-only revisions). Word/phrase identities, lexical content and all
166 word recordings are preserved. See the [Level 2 audit](../../../reports/hsk-level2-1.1.1-import.json).

`level-3.json` follows v1.1.2, with 23 revised examples across 21 entries. All
500 word identities, lexical fields and 443 word recordings remain exact; 977
example IDs are preserved. See the [Level 3 audit](../../../reports/hsk-level3-1.1.2-import.json).

`level-4.json` follows v1.1.1: only sentence examples change (43 examples across
38 entries). All 1,000 word IDs, lexical fields, topics and 797 word recordings
remain unchanged; 1,957 example IDs are retained. See the [Level 4 audit](../../../reports/hsk-level4-1.1.1-import.json).

Level files are written one compact entry per line by `scripts/vocabulary_store.py` / `scripts/vocabulary-store.mjs` (byte-identical), so each stays under the repository's 10 MB per-file limit; `index.json` stays indented. Both are ordinary JSON arrays for every reader.

The writers measure UTF-8 bytes before writing. A level reaching 9,000,000 bytes
is split into two ordered `level-N-part-1.json` / `level-N-part-2.json` files;
each must remain below that threshold. The index registers both filenames, and
all readers preserve the exact record order and audio attachments. Unchanged
parts retain their existing checkout line endings.

The v1.0.5 Level 5 part is **7,515,284 bytes (7.52 MB)**, below the strict
10,000,000-byte limit. It retains one compact JSON entry per line, without
indentation, and preserves all record identities and 1,306 word-audio attachments.
The Level 5 data test checks the size and compact line structure.

Level 6 follows [the 1.0.1 handoff](../../../importer/hsk/hsk3_level6_1.0.1.json):
1,800 word records (IDs 3601–5400) and 3,600 examples. The 850 changed official
serials are reconciled to the PDF currently linked by the official HSK site.
UUIDs, record order, example IDs/content and all 1,313 attached word recordings
remain exact. The full compact level would be 10,396,738 bytes, so it is stored
as two ordinary JSON arrays:

| Part | Entries | UTF-8 bytes |
| --- | ---: | ---: |
| [level-6-part-1.json](level-6-part-1.json) | 900 | 5,132,424 |
| [level-6-part-2.json](level-6-part-2.json) | 900 | 5,264,317 |

Generate with `node scripts/import-hsk-level6.mjs --write` from the repository
root; omit `--write` for an audit, and add `--report <path>` to save it. The
[import audit](../../../reports/hsk-level6-1.0.1-import.json) records identities,
readings, output hashes and preservation checks. Field-level dictionary
attribution, corpus credits and revision evidence are retained. One invisible
leading U+00AD in example 4491/written is removed from Chinese and pinyin during
import, with an explicit normalization note; the source file remains unchanged.
The literal slash in 5257/conversational remains punctuation.

Level 6 has 1,313 exact word recordings; sentence audio remains unattached. Accepted replacement statuses
and language-review-needed statuses remain distinct; all entries remain drafts.
The [font audit](../../../reports/hsk-level6-1.0.0-fonts.json) records public font
coverage additions. `.gitattributes` preserves the Level 6 part bytes across
platform checkouts so the audit checksums remain stable.

`studyMetadata.numberingRevision.previousId` retains the earlier official serial
for each word. Current `hskSource`, source references and `studyMetadata.source`
point to 1.0.1, while `secondarySources` retains versioned earlier references.
Repeat imports recognize the exact old/current source checksum and preserve the
same word's UUID/audio when two official serials swap positions.
