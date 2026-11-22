# Vocabulary data

The split files contain the browser-consumed Mandarin Tutor vocabulary. `index.json`
holds shared categories, other top-level metadata, and the ordered part filenames.
`level-1.json` through `level-5.json` hold the corresponding HSK entries;
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
`level-5.json` now follows v1.0.1: 1,600 draft terms, 30 revised meanings and
3,200 rewritten draft examples. The initial v1.0.0 sentence deferral is historical.
All source verification limits, exact word IDs, compatible recordings and original
syllabus provenance remain attached. Optional terms-only imports preserve existing
examples; normal imports use the current source examples.

Level 5 recordings were packaged externally for owner CDN upload; their exact
word/reading matches remain valid for v1.0.1. No local media paths are runtime audio
attachments. See the [Level 1 audit](../../../reports/hsk-level1-1.7.1-import.json)
and [Level 5 audit](../../../reports/hsk-level5-1.0.1-import.json).

`level-2.json` follows v1.1.1, with 25 updated examples (10 changed sentence texts
and 15 pinyin-only revisions). Word/phrase identities, lexical content and all
166 word recordings are preserved. See the [Level 2 audit](../../../reports/hsk-level2-1.1.1-import.json).

`level-3.json` follows v1.1.2, with 23 revised examples across 21 entries. All
500 word identities, lexical fields and 443 word recordings remain exact; 977
example IDs are preserved. See the [Level 3 audit](../../../reports/hsk-level3-1.1.2-import.json).

`level-4.json` follows v1.1.1: only sentence examples change (43 examples across
38 entries). All 1,000 word IDs, lexical fields, topics and 797 word recordings
remain unchanged; 1,957 example IDs are retained. See the [Level 4 audit](../../../reports/hsk-level4-1.1.1-import.json).
