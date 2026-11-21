# HSK Level 1–3 handoffs

These owner-supplied source files retain their original UTF-8 bytes and versioned filenames. All three levels use the shared topic sidecar `hsk3_topics.json`. They are offline inputs read by the importers and compatibility tests, never imported by browser modules. Previous checksum-bound inputs are retained in [archive/](archive/README.md).

| File | Purpose and consumers | Producer |
| --- | --- | --- |
| [hsk3_level1_1.6.1.json](hsk3_level1_1.6.1.json) | 300 headwords and 600 examples, with 24 revised sentences. Read by the Level 1 importer and tests. | Supplied `hsk-example-pairs/1.2.0`, data version 1.6.1. |
| [hsk3_level2_1.0.3.json](hsk3_level2_1.0.3.json) | 200 syllabus entries (301–500) and 400 examples, with six revised sentences. Read by the Level 2 importer and tests. | Supplied `hsk-example-pairs/1.2.0`, data version 1.0.3. |
| [hsk3_level3_1.0.4.json](hsk3_level3_1.0.4.json) | 500 syllabus entries (501–1000), meanings, readings, 1,000 examples and editorial metadata. Read by the Level 3 importer and tests. | Supplied `hsk-example-pairs/1.2.0`, data version 1.0.4. |
| [hsk3_topics.json](hsk3_topics.json) | Shared 20-topic taxonomy; all importers require exact agreement with embedded topics. | Supplied taxonomy sidecar, version 1.1.0. |
| `.gitattributes` | Disables Git line-ending conversion for current and archived checksum-bound sources. | Maintained alongside the pinned inputs. |

Source SHA-256 values:

- Level 1: `b86822f2e34f1ca0f068ccc3382514c8c1294a5265f46f8f168912ea0fe64a08`
- Level 2: `f361dcb92b838ab403099b3bab2887073f6ae330fe1cb9f1fc4240108f92d68c`
- Level 3: `119cc3981a6096859892145d667878d138c73a072c935adc40319368aeeedd5d`
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

# Audit Level 2, or replace all Level 2 study content and retire every old example.
node scripts/import-hsk-level2.mjs
node scripts/import-hsk-level2.mjs --write

# Capture the initial replacement report before rerunning against imported data.
node scripts/import-hsk-level2.mjs --write --report reports/hsk-level2-import.json
# Audit or import the 500 Level 3 syllabus headwords.
node scripts/import-hsk-level3.mjs
node scripts/import-hsk-level3.mjs --write
node --test scripts/import-hsk-level1.test.mjs scripts/import-hsk-level2.test.mjs scripts/import-hsk-level3.test.mjs
```

Use `--source`, `--topics` and `--vocabulary` to supply alternate input paths; `--output` selects a candidate output with `--write`. The Level 2 and 3 CLIs call the shared boundary in `scripts/import-hsk-level1.mjs`. All importers support their pinned schema/version and fail before writing if identities, taxonomy references or readings are incompatible.

Reimports match the existing syllabus ID **and exact headword**, retaining entry UUIDs, explicit word/phrase kinds, compatible entry recordings and existing syllabus provenance. Level 3's first import creates stable UUIDs from syllabus IDs and treats the supplied headwords as word entries, without inferring phrase kinds from length. It records the handoff itself as the syllabus source, rather than claiming independently verified primary-source provenance. Other levels remain unchanged; shared topics keep the same category UUIDs across all levels.

Level 1's handoff explicitly does not independently certify official serial numbers. It retains example UUIDs/audio for unchanged sentence text and gives new sentences deterministic UUIDs. Its former unofficial phrases are removed.

Level 2 retains all 200 existing syllabus entries, including the four explicit phrases 不好意思, 没意思, 为什么 and 有意思. Separate 过 and 花 records retain their exact IDs and readings; displayed headwords are not unique identities. All 200 legacy examples are replaced by 400 newly sourced example records, even where the new handoff contains the same text. Their deterministic IDs use a Level 2 namespace; later imports preserve recordings only for that exact new ID, text and reading. The initial source has no audio. Old spreadsheet POS provenance stays in `secondarySources`; `studyMetadata` records the source checksum, taxonomy, POS notes, original syllabus headword/POS labels and verification status. The handoff claims syllabus transcription; examples, meanings, translations and sentence pinyin remain editorial, without native-speaker certification.

Word audio is a separate [checksum-bound source handoff](../data/hsk-audio/README.md), imported with `scripts/import-hsk-level2-audio.py`; the raw HSK JSON contains no audio. The 166 exact Level 2 word/reading matches are attached; 13 differently recorded readings and 21 missing headwords remain excluded. See [the upload instructions](../data/hsk-audio/LOVABLE_HANDOFF.md) and [coverage report](../../reports/hsk-level2-audio.md). Reimporting Level 2 study content preserves attached word recordings. Level 3 records have no supplied recordings.

Pinyin is segmented with the shared [phrase-pinyin-align.ts](../../src/lib/phrase-pinyin-align.ts) and recorded [syllable inventory](../../src/data/pinyin/README.md). Every sentence must have one unique syllable split matching its Han characters. Hyphens in supplied readings act as boundaries during alignment; original whole readings remain in `pinyinDisplay`. No dictionary reading is inserted. For `shéi / shuí`, the first reading supplies character tokens and both alternatives remain displayed. Tokens remain unreviewed and entries remain draft: successful alignment is structural validation, not native-speaker review.

Generated output is [../../src/data/vocabulary.json](../../src/data/vocabulary.json), consumed through [data-contract.ts](../../src/lib/data-contract.ts). Optional reports belong under [../../reports/](../../reports/README.md); see the [Level 1 compatibility summary](../../reports/hsk-level1-import.md), [Level 1 initial report](../../reports/hsk-level1-import.json), [Level 2 compatibility summary](../../reports/hsk-level2-import.md) and [Level 2 initial report](../../reports/hsk-level2-import.json). Reimporting either unchanged handoff does not change vocabulary or timestamps. Reports reflect the input state: a repeat import reports zero retired legacy examples and 400 preserved Level 2 example IDs.

## Font coverage

The new examples introduce 码 (U+7801); classification notes also contain 性 (U+6027). Two extra `@font-face` rules in [../../src/styles.css](../../src/styles.css) extend the existing vocabulary families without changing their original CDN files. Their exact Google Fonts CSS requests were:

- `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=%E6%80%A7%E7%A0%81`
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC&text=%E6%80%A7%E7%A0%81`

Use a current Chrome user-agent when retrieving these CSS subsets to obtain WOFF2. The returned `fonts.gstatic.com` URLs and `U+6027, U+7801` ranges are recorded directly in the rules. These fonts load from Google's CDN; no media binaries were added. Alternatively, rebuild complete vocabulary subsets with [../../scripts/build-vocabulary-fonts.py](../../scripts/build-vocabulary-fonts.py), upload them through the established asset workflow, and replace the vocabulary font rules together. Font coverage tests combine every subset belonging to each family.

Level 2's retained syllabus POS annotations add 代副形数缀连量. Two further rules cover `U+4EE3, U+526F, U+5F62, U+6570, U+7F00, U+8FDE, U+91CF`, using these exact requests and the returned WOFF2 URLs:

- `https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&text=%E4%BB%A3%E5%89%AF%E5%BD%A2%E6%95%B0%E7%BC%80%E8%BF%9E%E9%87%8F`
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC&text=%E4%BB%A3%E5%89%AF%E5%BD%A2%E6%95%B0%E7%BC%80%E8%BF%9E%E9%87%8F`

Level 3 adds 253 Han characters absent from the existing subsets. Two additional Google Fonts `text=` subsets in `src/styles.css` cover these exact code points; their WOFF2 character maps were checked against the requested characters.
