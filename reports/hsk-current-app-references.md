# Complete current-ID audit for the application

The owner's lesson fixes are correct. All **1,179** recorded lesson-word
references resolve by current official ID, exact headword, recorded reading and
POS, meaning and copied examples. All **100** active lessons passed schema and
semantic validation, with **98** curriculum placements
(81 HSK and 17 conversational) checked against their exact lesson references.
All 12 neutral-tone recording bindings use the current word ID and reading.

Remaining gaps corrected:

- The Level 1 lesson manifest retained old IDs; all 21 rows now follow their current lesson JSON.
- Exported HTML/Markdown still included old labels; all 162 companion files now match authoritative JSON.
- All 5,400 vocabulary records exported historical numbering metadata and previous HSK source references. Those fields/citations are now retained only in the offline reference-history ledger. Current source references remain exact.
- Historical numeric IDs inside reused-editorial example citations and revision metadata were removed from app exports. Corpus sentence IDs, source attribution, licenses and original source checksums are preserved.
- Browser types and lesson resolution have no previous-ID compatibility mapping. Future HSK vocabulary imports apply the same cleanup.
- The Level 3 source ZIP also contains old reviewed lower-level references. The offline importer now validates each exact ID/headword/reading tuple and normalizes combined curriculum and companion labels before writing; source ZIP bytes stay unchanged.

An independent comparison with the committed runtime confirms that word UUIDs,
entry order, all **10,800** example identities/text/readings and all **4,530**
word recordings are unchanged outside the intended reference metadata cleanup.
Historical sources remain outside the app; current references are not substituted
into historical citations as though those were the original source numbers.

## Validation

Whole-app reference and companion checks pass. All 35 Level 3 source lessons,
605 word bindings and the combined curriculum pass the source importer audit.
All 48 importer regressions pass; lesson, vocabulary, flashcard and completion
checks cover current direct-ID links.
The production build passes.

Run:

```sh
node scripts/reconcile-hsk-app-references.mjs --check
python scripts/reconcile-lesson-hsk-labels.py --check
node scripts/validate-hsk-level1-5-numbering.mjs
```

Current arrays retain one compact entry per line:

| Part | Entries | UTF-8 bytes |
| --- | ---: | ---: |
| level-1.json | 300 | 1,182,128 |
| level-2.json | 200 | 780,324 |
| level-3.json | 500 | 1,931,468 |
| level-4.json | 1,000 | 3,971,631 |
| level-5.json | 1,600 | 7,307,447 |
| level-6-part-1.json | 900 | 5,002,504 |
| level-6-part-2.json | 900 | 5,136,351 |

See [machine results](hsk-current-app-references.json),
[offline history](../importer/data/hsk-app-reference-history/README.md) and the
[Level 3 source audit](lessons-hsk3-import.json). Existing historical-file deletions
and unrelated local work were left untouched.
