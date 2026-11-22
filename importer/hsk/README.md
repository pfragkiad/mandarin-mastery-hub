# HSK Level 1–4 handoffs

These owner-supplied source files retain their original UTF-8 bytes and versioned filenames. All four levels use the shared topic sidecar `hsk3_topics.json`. They are offline inputs read by the importers and compatibility tests, never imported by browser modules. Previous checksum-bound inputs are retained in [archive/](archive/README.md).

| File | Purpose and consumers | Producer |
| --- | --- | --- |
| [hsk3_level1_1.7.0.json](hsk3_level1_1.7.0.json) | 300 headwords and 600 examples, with 24 revised sentences. Read by the Level 1 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.7.0. |
| [hsk3_level2_1.1.0.json](hsk3_level2_1.1.0.json) | 200 syllabus entries (301–500) and 400 examples, with six revised sentences. Read by the Level 2 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.0. |
| [hsk3_level3_1.1.0.json](hsk3_level3_1.1.0.json) | 500 syllabus entries (501–1000), meanings, readings, 1,000 examples and editorial metadata. Read by the Level 3 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.0. |
| [hsk3_level4_1.1.0.json](hsk3_level4_1.1.0.json) | 1,000 syllabus entries (1001–2000), meanings, readings, 2,000 examples and editorial metadata. Read by the Level 4 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.0. |
| [hsk3_topics.json](hsk3_topics.json) | Versioned shared taxonomy with 22 parent topics and 25 subtopics; all importers require exact agreement with both embedded registries. | Supplied `hsk-topics/2.0.0` sidecar, version 2.0.0. |
| `.gitattributes` | Disables Git line-ending conversion for current and archived checksum-bound sources. | Maintained alongside the pinned inputs. |

Source SHA-256 values:

- Level 1: `eeddab94e661294e3c209bdbe5f1f9e73f251eec43e13940210a31be1e03056a`
- Level 2: `735ecd4b029b2bc34430809a2501c8c6f8b05b3fd108bd3d31dc2319e3e2f478`
- Level 3: `04f6c394775896cc0afbf346b9c7528c46d7f7d67e4c75f2709af2719620a0e5`
- Level 4: `0225c634973aa66d58d6d851b7990ebbd1ca9c4312e8123641dbf2d20bfd7abd`
- Topics: `d828f350196951cbe931e1e8ae7be3ab4ce71c3e32aaaa8a38cf1164040d3d3f`

From the repository root:

```sh
# Validate and inspect the replacement without changing vocabulary data.
node scripts/import-hsk-level1.mjs

# Replace all Level 1 records, including removing its old unofficial phrases.
node scripts/import-hsk-level1.mjs --write

# Optionally write a candidate elsewhere and generate an audit report.
node scripts/import-hsk-level1.mjs --write --output /tmp/vocabulary.json --report /tmp/hsk-import.json

node --test scripts/import-hsk-level1.test.mjs

# Audit Level 2, or replace all Level 2 study content and retire every old example.
node scripts/import-hsk-level2.mjs
node scripts/import-hsk-level2.mjs --write

# Capture the initial replacement report before rerunning against imported data.
node scripts/import-hsk-level2.mjs --write --report reports/hsk-level2-import.json
# Audit or import the 500 Level 3 syllabus headwords.
node scripts/import-hsk-level3.mjs
node scripts/import-hsk-level3.mjs --write
# Audit or import the 1,000 Level 4 syllabus headwords.
node scripts/import-hsk-level4.mjs
node scripts/import-hsk-level4.mjs --write
node --test scripts/import-hsk-level1.test.mjs scripts/import-hsk-level2.test.mjs scripts/import-hsk-level3.test.mjs scripts/import-hsk-level4.test.mjs
```

Use `--source`, `--topics` and `--vocabulary` to supply alternate input paths; `--output` selects a candidate output with `--write`. Vocabulary paths may be a split directory or a combined `.json` file. The Level 2–4 CLIs call the shared boundary in `scripts/import-hsk-level1.mjs`. All importers support their pinned schema/version and fail before writing if identities, taxonomy references or readings are incompatible.

The v2 migration recategorizes all 2,000 syllabus entries without changing headwords, readings, meanings, POS or examples. Parent topics remain the browser collections, with stable category UUIDs; exact `primarySubtopicId` and `subtopicIds` are retained in `studyMetadata` for the 25 parented subtopics. Taxonomy and classification remain editorial drafts. See the [supplied migration report](../../reports/hsk3_topics_v2_migration_report.md), [supplied change list](../../reports/hsk3_topics_v2_migration_changes.csv), and [verified import audit](../../reports/hsk-topics-v2-import.json). The supplied reports are preserved byte-for-byte under `reports/`; optional compatibility-export filenames mentioned inside the report were not supplied here.

Two owner-approved example pinyin spacing corrections remain applied by the importer (Level 1 ID 36 conversational; Level 3 ID 873 written). Each correction is bound to its exact sentence and source reading; other source readings stay untouched. Earlier source releases and taxonomy are archived byte-for-byte; Level 3/4 audio manifests continue to validate against those exact archived releases.

Reimports match the existing syllabus ID **and exact headword**, retaining entry UUIDs, explicit word/phrase kinds, compatible entry recordings and existing syllabus provenance. Levels 3 and 4 create stable UUIDs from syllabus IDs and treat the supplied headwords as word entries, without inferring phrase kinds from length. They record the handoff itself as the syllabus source, rather than claiming independently verified primary-source provenance. Other levels remain unchanged; shared topics keep the same category UUIDs across all levels.

Level 1's handoff explicitly does not independently certify official serial numbers. It retains example UUIDs/audio for unchanged sentence text and gives new sentences deterministic UUIDs. Its former unofficial phrases are removed.

Level 2 retains all 200 existing syllabus entries, including the four explicit phrases 不好意思, 没意思, 为什么 and 有意思. Separate 过 and 花 records retain their exact IDs and readings; displayed headwords are not unique identities. All 200 legacy examples are replaced by 400 newly sourced example records, even where the new handoff contains the same text. Their deterministic IDs use a Level 2 namespace; later imports preserve recordings only for that exact new ID, text and reading. The initial source has no audio. Old spreadsheet POS provenance stays in `secondarySources`; `studyMetadata` records the source checksum, taxonomy, POS notes, original syllabus headword/POS labels and verification status. The handoff claims syllabus transcription; examples, meanings, translations and sentence pinyin remain editorial, without native-speaker certification.

Word audio is a separate [checksum-bound source handoff](../data/hsk-audio/README.md), imported with `scripts/import-hsk-level2-audio.py`; the raw HSK JSON contains no audio. The 166 exact Level 2 word/reading matches are attached; 13 differently recorded readings and 21 missing headwords remain excluded. See [the upload instructions](../data/hsk-audio/LOVABLE_HANDOFF.md) and [coverage report](../../reports/hsk-level2-audio.md). Reimporting Level 2 study content preserves attached word recordings. Levels 3 and 4 use `scripts/import-hsk-word-audio.py --level N`: Level 3's 443 exact matches are attached ([report](../../reports/hsk-level3-audio.md); 12 different readings and 45 missing headwords excluded) and Level 4's 797 ([report](../../reports/hsk-level4-audio.md); 36 different readings and 167 missing headwords excluded).

Pinyin is segmented with the shared [phrase-pinyin-align.ts](../../src/lib/phrase-pinyin-align.ts) and recorded [syllable inventory](../../src/data/pinyin/README.md). Every sentence must have one unique syllable split matching its Han characters. Hyphens and separated erhua `r` are adjusted for alignment only; original whole readings remain in `pinyinDisplay`. Level 4's sourced `ǹg` is accepted only for 嗯, without changing the syllable inventory. No dictionary reading is inserted. For `shéi / shuí`, the first reading supplies character tokens and both alternatives remain displayed. Tokens remain unreviewed and entries remain draft: successful alignment is structural validation, not native-speaker review.

Generated output is [../../src/data/vocabulary/](../../src/data/vocabulary/README.md), consumed through [data-contract.ts](../../src/lib/data-contract.ts). Optional reports belong under [../../reports/](../../reports/README.md); see the [Level 1 compatibility summary](../../reports/hsk-level1-import.md), [Level 1 initial report](../../reports/hsk-level1-import.json), [Level 2 compatibility summary](../../reports/hsk-level2-import.md) and [Level 2 initial report](../../reports/hsk-level2-import.json). Reimporting either unchanged handoff does not change vocabulary or timestamps. Reports reflect the input state: a repeat import reports zero retired legacy examples and 400 preserved Level 2 example IDs.

## Font coverage

The new examples introduce 码 (U+7801); classification notes also contain 性 (U+6027). Two extra `@font-face` rules in [../../src/styles.css](../../src/styles.css) extend the existing vocabulary families without changing their original CDN files. Their exact Google Fonts CSS requests were:

- `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=%E6%80%A7%E7%A0%81`
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC&text=%E6%80%A7%E7%A0%81`

Use a current Chrome user-agent when retrieving these CSS subsets to obtain WOFF2. The returned `fonts.gstatic.com` URLs and `U+6027, U+7801` ranges are recorded directly in the rules. These fonts load from Google's CDN; no media binaries were added. Alternatively, rebuild complete vocabulary subsets with [../../scripts/build-vocabulary-fonts.py](../../scripts/build-vocabulary-fonts.py), upload them through the established asset workflow, and replace the vocabulary font rules together. Font coverage tests combine every subset belonging to each family.

Level 2's retained syllabus POS annotations add 代副形数缀连量. Two further rules cover `U+4EE3, U+526F, U+5F62, U+6570, U+7F00, U+8FDE, U+91CF`, using these exact requests and the returned WOFF2 URLs:

- `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=%E4%BB%A3%E5%89%AF%E5%BD%A2%E6%95%B0%E7%BC%80%E8%BF%9E%E9%87%8F`
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC&text=%E4%BB%A3%E5%89%AF%E5%BD%A2%E6%95%B0%E7%BC%80%E8%BF%9E%E9%87%8F`

Level 3 adds 253 Han characters absent from the existing subsets. Two additional Google Fonts `text=` subsets in `src/styles.css` cover these exact code points; their WOFF2 character maps were checked against the requested characters.

Level 4 adds a further 429 Han characters; two additional Google Fonts `text=` subsets cover them, with their WOFF2 character maps checked against the requested characters.
