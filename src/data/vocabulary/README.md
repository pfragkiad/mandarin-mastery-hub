# Vocabulary data

The split files contain the browser-consumed Mandarin Tutor vocabulary. `index.json`
holds shared categories, other top-level metadata, and the ordered part filenames.
`level-1.json` through `level-4.json` hold the corresponding HSK entries;
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
