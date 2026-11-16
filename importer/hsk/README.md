# HSK Level 1 handoff

These owner-supplied source files retain their original UTF-8 bytes. The main handoff keeps its versioned filename; the shared topic sidecar is named `hsk3_topics.json` because Level 1 and Level 2 use the same taxonomy. They are offline inputs read by the importer and compatibility tests, never imported by browser modules. Future importer-only datasets normally belong under [../data/](../data/README.md).

| File | Purpose and consumers | Producer |
| --- | --- | --- |
| [hsk3_level1_1.6.0.json](hsk3_level1_1.6.0.json) | 300 headwords, meanings, whole-word readings, 600 examples, editorial notes, topic/POS facets and verification limits. Read by `scripts/import-hsk-level1.mjs` and compatibility tests. | Supplied `hsk-example-pairs/1.2.0` handoff, data version 1.6.0. |
| [hsk3_topics.json](hsk3_topics.json) | Shared 20-topic taxonomy for Level 1 and Level 2: IDs, labels and descriptions. Read by `scripts/import-hsk-level1.mjs` and its boundary tests; the importer requires exact agreement with the main file's embedded topics. | Supplied taxonomy sidecar, taxonomy version 1.1.0; renamed without changing its bytes or checksum. |
| `.gitattributes` | Disables Git line-ending conversion for the two checksum-bound source files. | Maintained alongside the pinned inputs. |

Source SHA-256 values:

- Main handoff: `1b1b6d1f167394cad805eff0ceb041680b32c5ebfac507bf2077605f7d00170e`
- Topics: `b3d5ef85064afb3fd7a7e835b47ff3d43e693e7751190dc30a9de3c06da5165d`

From the repository root:

```sh
# Validate and inspect the replacement without changing vocabulary.json.
node scripts/import-hsk-level1.mjs

# Replace all Level 1 records, including removing its old unofficial phrases.
node scripts/import-hsk-level1.mjs --write

# Optionally write a candidate elsewhere and generate an audit report.
node scripts/import-hsk-level1.mjs --write --output /tmp/vocabulary.json --report /tmp/hsk-import.json

node --test scripts/import-hsk-level1.test.mjs
```

Use `--source`, `--topics` and `--vocabulary` to supply alternate input paths. The importer supports this pinned schema/version and fails before writing if identities, taxonomy references or readings are incompatible.

The importer matches the existing syllabus ID **and exact headword**, retaining word UUIDs, syllable-compatible recordings and existing syllabus provenance. The new dataset itself explicitly does not independently certify official serial numbers. It replaces meanings, pinyin, classifications and examples; stores all primary/secondary topics; retains example UUIDs and audio only for unchanged sentence text; and gives new sentences deterministic UUIDs. Other levels remain unchanged. Only newly orphaned Level 1 category rows are removed.

Pinyin is segmented with the shared [phrase-pinyin-align.ts](../../src/lib/phrase-pinyin-align.ts) and recorded [syllable inventory](../../src/data/pinyin/README.md). Every sentence must have one unique syllable split matching its Han characters. No dictionary reading is inserted. The original whole reading, case, punctuation and word spacing remain in `pinyinDisplay`; tokens carry the validated slices. For the alternate headword reading `shéi / shuí`, the first reading supplies character tokens and the complete alternatives remain displayed and searchable. Tokens remain unreviewed and entries remain draft: successful alignment is structural validation, not native-speaker review.

Generated output is [../../src/data/vocabulary.json](../../src/data/vocabulary.json), consumed through [data-contract.ts](../../src/lib/data-contract.ts). The optional report belongs under [../../reports/](../../reports/README.md); see the [compatibility summary](../../reports/hsk-level1-import.md) and [initial replacement report](../../reports/hsk-level1-import.json). Reimporting the same handoff does not change the generated vocabulary.

## Font coverage

The new examples introduce 码 (U+7801); classification notes also contain 性 (U+6027). Two extra `@font-face` rules in [../../src/styles.css](../../src/styles.css) extend the existing vocabulary families without changing their original CDN files. Their exact Google Fonts CSS requests were:

- `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=%E6%80%A7%E7%A0%81`
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC&text=%E6%80%A7%E7%A0%81`

Use a current Chrome user-agent when retrieving these CSS subsets to obtain WOFF2. The returned `fonts.gstatic.com` URLs and `U+6027, U+7801` ranges are recorded directly in the rules. These fonts load from Google's CDN; no media binaries were added. Alternatively, rebuild complete vocabulary subsets with [../../scripts/build-vocabulary-fonts.py](../../scripts/build-vocabulary-fonts.py), upload them through the established asset workflow, and replace the vocabulary font rules together. Font coverage tests combine every subset belonging to each family.
