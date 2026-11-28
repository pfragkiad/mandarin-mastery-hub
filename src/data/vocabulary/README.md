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

The preceding Level 1 release v1.7.1, including 33 revised sentence examples.
The preceding Level 5 release v1.0.5 contains 1,600 draft terms and 3,200 draft examples.
Relative to v1.0.1, 190 examples and 69 meanings are revised. The initial v1.0.0 sentence deferral is historical.
All source verification limits, exact word IDs, compatible recordings and original
syllabus provenance remain attached. Optional terms-only imports preserve existing
examples; normal imports use the current source examples.

Level 5 word recordings are on the Lovable CDN: 1,351 are attached (the original
1,306, exact supplemental 为 wéi and 44 listening-reviewed additions; the original
collection's other different readings and still-unverified words stay without audio;
see the [Level 5 audio report](../../../reports/hsk-level5-audio.md)).
Draft example sentences have no recordings. No local media paths are runtime audio
attachments. See the [Level 1 audit](../../../reports/hsk-level1-1.7.1-import.json)
and [Level 5 audit](../../../reports/hsk-level5-1.0.5-import.json).

The preceding Level 2 release v1.1.1 included with 25 updated examples (10 changed sentence texts
and 15 pinyin-only revisions). Word/phrase identities, lexical content and all
166 word recordings are preserved. See the [Level 2 audit](../../../reports/hsk-level2-1.1.1-import.json).

The preceding Level 3 release v1.1.2 included with 23 revised examples across 21 entries. All
500 word identities, lexical fields and 443 word recordings remain exact; 977
example IDs are preserved. See the [Level 3 audit](../../../reports/hsk-level3-1.1.2-import.json).

The preceding Level 4 release v1.1.1: only sentence examples change (43 examples across
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
UUIDs, record order, example IDs/content and all 1,313 original word recordings
remain exact; 78 reviewed/source-screened supplemental recordings are added. The full compact level is stored
as two ordinary JSON arrays:

| Part | Entries | UTF-8 bytes |
| --- | ---: | ---: |
| [level-6-part-1.json](level-6-part-1.json) | 900 | 5,002,504 |
| [level-6-part-2.json](level-6-part-2.json) | 900 | 5,136,351 |

Generate with `node scripts/import-hsk-level6.mjs --write` from the repository
root; omit `--write` for an audit, and add `--report <path>` to save it. The
[import audit](../../../reports/hsk-level6-1.0.1-import.json) records identities,
readings, output hashes and preservation checks. Field-level dictionary
attribution, corpus credits and revision evidence are retained. One invisible
leading U+00AD in example 4491/written is removed from Chinese and pinyin during
import, with an explicit normalization note; the source file remains unchanged.
The literal slash in 5257/conversational remains punctuation.

Level 6 has 1,391 word recordings (1,313 original + 65 reviewed + 13 source/transcription-screened additions); sentence audio remains unattached. Accepted replacement statuses
and language-review-needed statuses remain distinct; all entries remain drafts.
The [font audit](../../../reports/hsk-level6-1.0.0-fonts.json) records public font
coverage additions. `.gitattributes` preserves the Level 6 part bytes across
platform checkouts so the audit checksums remain stable.

All runtime HSK indices and source references use current official numbers.
Historical source numbers and prior source citations are retained only in
[offline reference history](../../../importer/data/hsk-app-reference-history/README.md).
Reimports preserve UUIDs/audio while keeping historical numbering outside app data.

## Current Levels 1-5 numbering migration

Active source versions are Level 1 **1.7.2**, Level 2 **1.1.2**, Level 3 **1.1.3**,
Level 4 **1.1.2** and Level 5 **1.0.6**. Earlier version descriptions above record
the preceding sentence-review releases. The current files update 1,092 official
indices while preserving every UUID, order, lexical reading and all 2,988 pre-migration word
recordings. Six POS assignments and the two adverbial 白 examples are corrected.
All lesson and curriculum bindings use current official indices directly;
`syllabusPinyin` preserves official citation readings separately from recorded speech.

Each entry occupies one compact JSON line. After reference cleanup,
UTF-8 sizes are 1,182,128 / 780,324 / 1,931,468 / 3,971,631 / 7,307,447 bytes for
Levels 1-5; no split is needed. See the
[runtime import audit](../../../reports/hsk-level1-5-official-numbering-import.json)
and [migration report](../../../reports/hsk-level1-5-official-numbering-migration.md).

## Supplemental exact and reviewed recordings

The [missing-audio package](../../../importer/data/missing-audio/README.md) adds eight
source-index exact attachments after the ID migration: 了 le (Level 1); 啊 a, 长 cháng,
地 de and 得 de (Level 2); 得 dé (Level 3); 为 wéi (Levels 4 and 5). Listening review
then adds 14 / 9 / 16 / 48 / 44 / 65 recordings across Levels 1–6. Current totals are
291 / 179 / 460 / 846 / 1,351 / 1,378 respectively: 3,127 across Levels 1–5 and 4,505 overall.

啦 la reuses its existing Level 6 recording; standalone 哇 wa is bound in the
catalogue. The neutral-tone sidecar has thirteen exact word recordings, including reviewed 过 guo, 头 tou and 子 zi. Twenty-one words
without a pronunciation match and both non-neutral 呀 candidates remain unattached;
25 reviewed yán slots replace the old quarantined clip. Repeat imports and both
official-ID validators preserve these additions and every older attachment.

The [whole-app reference audit](../../../reports/hsk-current-app-references.md) checks all 5,400 words, 100 lessons, curriculum and neutral-audio bindings. No historical HSK IDs are exported to the browser.
