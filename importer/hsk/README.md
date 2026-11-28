# HSK Level 1–6 handoffs

The owner-supplied Level 1–5 source files retain their original UTF-8 bytes and versioned filenames. Level 6 retains the completed 0.1.0 baseline alongside the 1.0.0 release built from accepted reviews and additional requested rewrites. All six levels use the shared topic sidecar `hsk3_topics.json`. These are offline handoffs, never imported by browser modules. Levels 1–6 have import CLIs; Level 6 also has a release builder and standalone validator. Previous checksum-bound inputs are retained in [archive/](archive/README.md).

| File | Purpose and consumers | Producer |
| --- | --- | --- |
| [hsk3_level1_1.7.1.json](hsk3_level1_1.7.1.json) | 300 headwords and 600 examples; v1.7.1 revises 33 sentences across 32 entries. Read by the Level 1 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.7.1. |
| [hsk3_level2_1.1.1.json](hsk3_level2_1.1.1.json) | 200 syllabus entries (301–500) and 400 examples; v1.1.1 updates 25 examples, including 10 revised sentence texts. Read by the Level 2 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.1. |
| [hsk3_level3_1.1.2.json](hsk3_level3_1.1.2.json) | 500 syllabus entries (501–1000), meanings, readings and 1,000 examples; v1.1.2 revises 23 examples across 21 entries. Read by the Level 3 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.2. |
| [hsk3_level4_1.1.1.json](hsk3_level4_1.1.1.json) | 1,000 syllabus entries (1001–2000) and 2,000 examples; v1.1.1 revises 43 examples across 38 entries. Read by the Level 4 importer and tests. | Supplied `hsk-example-pairs/1.3.0`, data version 1.1.1. |
| [hsk3_level5_1.0.5.json](hsk3_level5_1.0.5.json) | 1,600 draft syllabus terms (2001–3600) and 3,200 draft examples; v1.0.5 revises 190 examples and 69 meanings. | Supplied `hsk-example-pairs/1.3.0`, data version 1.0.5. |
| [hsk3_level6_0.1.0.json](hsk3_level6_0.1.0.json) | Complete 1,800-headword Level 6 draft (3601–5400), with 3,600 examples: one conversational and one written per entry. Checked by `scripts/validate-hsk-level6.mjs`; not imported into application vocabulary. | Owner-requested completion of the first 100 entries; `hsk-example-pairs/1.3.0`, draft data version 0.1.0. |
| [hsk3_level6_1.0.0.json](hsk3_level6_1.0.0.json) | Current Level 6 release: 1,800 entries and 3,600 examples, with 704 replacements and 17 pinyin-only fixes. Consumed by `scripts/import-hsk-level6.mjs`; imported vocabulary occupies two compact parts. | `scripts/build-hsk-level6-release.py` from the frozen review ledger; `hsk-example-pairs/1.3.0`, data version 1.0.0. |
| [hsk3_topics.json](hsk3_topics.json) | Versioned shared taxonomy with 22 parent topics and 25 subtopics; all importers require exact agreement with both embedded registries. | Supplied `hsk-topics/2.0.0` sidecar, version 2.0.0. |
| `.gitattributes` | Disables Git line-ending conversion for current and archived checksum-bound sources. | Maintained alongside the pinned inputs. |

Source SHA-256 values:

- Level 1: `825b7b60f91fd55dc79b856f419cc240a327b38195936af064113e8efd821c49`
- Level 2: `3b1fdb54b150f48550b8a0276098206fcf80274fcf956f18f9d34f832f804f50`
- Level 3: `d482af00f9c6223aad5af2ee73aec1a087602e69ca38ff609206d36d21c4a434`
- Level 4: `bf7ff1b42c19069f41869e754ad140e1b6110be49b441ae7bfdeaa5583e976c3`
- Level 5: `cd99c18acccc6f0fe8a882d806b6e152ed884ecbf6dda686b635e69519956727`
- Level 6 v0.1.0: `359d066fbc59138dcc88cdb00cb054bb8c85a64cfb99d2ba7bb912bd8b6cbc47`
- Level 6 v1.0.0: `60f9241380ca88cae9c506cbe60bbf16f2d11e5093e1872f93834f1f12554a0d`
- Topics: `d828f350196951cbe931e1e8ae7be3ab4ce71c3e32aaaa8a38cf1164040d3d3f`

From the repository root:

```sh
# Validate and inspect the replacement without changing vocabulary data.
node scripts/import-hsk-level1.mjs

# Replace all Level 1 records, including removing its old unofficial phrases.
node scripts/import-hsk-level1.mjs --write

# Optionally write a candidate elsewhere and generate an audit report.
node scripts/import-hsk-level1.mjs --write --output /tmp/vocabulary.json --report /tmp/hsk-import.json

# Audit or import Level 5 terms and rewritten draft examples.
node scripts/import-hsk-level5.mjs
node scripts/import-hsk-level5.mjs --write --report reports/hsk-level5-1.0.5-import.json
node --test scripts/import-hsk-level5.test.mjs

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

Use `--source`, `--topics` and `--vocabulary` to supply alternate input paths; `--output` selects a candidate output with `--write`. Vocabulary paths may be a split directory or a combined `.json` file. The Level 2–5 CLIs call the shared boundary in `scripts/import-hsk-level1.mjs`. All importers support their pinned schema/version and fail before writing if identities, taxonomy references or readings are incompatible.

The v2 migration recategorizes all 2,000 syllabus entries without changing headwords, readings, meanings, POS or examples. Parent topics remain the browser collections, with stable category UUIDs; exact `primarySubtopicId` and `subtopicIds` are retained in `studyMetadata` for the 25 parented subtopics. Taxonomy and classification remain editorial drafts. See the [supplied migration report](../../reports/hsk3_topics_v2_migration_report.md), [supplied change list](../../reports/hsk3_topics_v2_migration_changes.csv), and [verified import audit](../../reports/hsk-topics-v2-import.json). The supplied reports are preserved byte-for-byte under `reports/`; optional compatibility-export filenames mentioned inside the report were not supplied here.

Two owner-approved example pinyin spacing corrections remain applied by the importer (Level 1 ID 36 conversational; Level 3 ID 873 written). Each correction is bound to its exact sentence and source reading; other source readings stay untouched. Earlier source releases and taxonomy are archived byte-for-byte; Level 3/4 audio manifests continue to validate against those exact archived releases.

Reimports match the existing syllabus ID **and exact headword**, retaining entry UUIDs, explicit word/phrase kinds, compatible entry recordings and existing syllabus provenance. Levels 3–5 create stable UUIDs from syllabus IDs and treat the supplied headwords as word entries, without inferring phrase kinds from length. They record the handoff itself as the syllabus source, rather than claiming independently verified primary-source provenance. Other levels remain unchanged; shared topics keep the same category UUIDs across all levels.

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

## Level 5 source revisions

The initial v1.0.0 import added 1,600 draft terms and deferred its algorithmic examples. The owner-approved v1.0.1 update now imports all 3,200 rewritten examples and 30 revised meanings, retaining the exact word identities, readings, taxonomy, source metadata and draft review status. Sentence pinyin remains mechanically generated and is not native-speaker certified. Unchanged example text/reading preserves its deterministic ID and any compatible recording. Explicit `includeExamples: false` calls retain the terms-only policy and preserve existing examples. See the [v1.0.1 import audit](../../reports/hsk-level5-1.0.1-import.json); the [initial v1.0.0 audit](../../reports/hsk-level5-import.json) remains historical.

Sentence alternatives are accepted only when both readings are recorded for one exact single-character vocabulary identity. Both alternate alignments must pass and differ only at that exact glyph. The first sourced reading supplies character tokens; the whole sentence retains its original alternatives in `pinyinDisplay`. Unrecorded alternatives, mismatched glyphs or ambiguous alignment fail before writing.

Word-audio preparation uses the pinned Shtooka source with exact readings; the [package report](../../reports/hsk-level5-audio-package.json) records exclusions and ZIP checksums. The ZIP and all MP3s are outside the repository, ready for the owner to upload to the CDN. The [audio guide](../data/hsk-audio/README.md) contains reproduction and attachment commands.

Level 5 terms add 431 Han code points beyond the previous vocabulary subsets. `scripts/extend-vocabulary-fonts.py` adds verified public font slices to both vocabulary font families; its requests contain public font-family names only, without sending the draft text. Both actual WOFF2 character maps were checked locally. [The font audit](../../reports/hsk-level5-fonts.json) records URLs, checksums, ranges and coverage.

## Level 1 v1.7.1

The current source replaces 33 examples across 32 entries, including sentence text, pinyin, translations, notes and register. All 300 word IDs, lexical fields, topics and 276 recordings are retained; the 567 unchanged examples keep their IDs. New sentence IDs are deterministic and never inherit recordings from replaced text. The previous v1.7.0 source is archived byte-for-byte. The supplied verification note explicitly excludes these revised sentences from its earlier vocabulary-boundary audit. See [the import report](../../reports/hsk-level1-1.7.1-import.json).

## Level 2 v1.1.1

This sentence-only release updates 25 examples across 25 entries: 10 changed Hanzi texts and 15 pinyin-only revisions. All 200 word/phrase identities, meanings, readings, POS, topics and 166 word recordings remain exact; 390 example IDs survive and the 10 changed texts receive deterministic new IDs. A changed sentence reading never inherits an old sentence recording. The supplied verification note retains editorial status and explicitly states that this release has no independent full word-level vocabulary audit. The previous v1.1.0 input is archived byte-for-byte. See [the import audit](../../reports/hsk-level2-1.1.1-import.json).

## Level 3 v1.1.2

This release revises 23 sentence examples across 21 entries. All 500 word IDs, lexical fields, POS, topics and 443 word recordings remain exact; 977 example IDs survive and replaced texts receive deterministic new IDs. The owner-approved ID 873 written-example pinyin spacing correction remains applied, bound to its exact source text and reading. All 1,000 examples pass structural pinyin alignment; this does not certify pronunciation, naturalness or the supplied vocabulary-boundary claim. The supplied verification text still mentions 20 topics, while the embedded registry exactly matches the current 22-parent/25-subtopic sidecar; that source wording is retained unchanged. The previous v1.1.0 input is archived byte-for-byte. See [the import audit](../../reports/hsk-level3-1.1.2-import.json).

## Level 4 v1.1.1

Only sentence examples change: 43 revised examples across 38 entries, including Hanzi, readings, translations and associated source metadata. All 1,000 word IDs, lexical fields, POS, topics and 797 word recordings remain exact. The 1,957 unchanged examples retain their IDs; the 43 replacement texts receive deterministic IDs and never inherit recordings from replaced sentences. All 2,000 examples pass structural pinyin alignment, without claiming linguistic or native-speaker certification. The source still mentions 20 topics in prose; its unchanged embedded registry matches the shared 22-parent/25-subtopic taxonomy exactly. The previous v1.1.0 input is archived byte-for-byte, while audio remains bound to its existing archived v1.0.3 source. See [the import audit](../../reports/hsk-level4-1.1.1-import.json).

## Level 5 v1.0.5

The current release revises 190 example sentences across 166 entries and 69 meanings (168 entries affected in total). All 1,600 word identities, headwords, readings, POS and topic/subtopic assignments remain unchanged. Reimporting preserves all 1,306 attached word recordings and 3,010 unchanged example IDs; changed text receives new deterministic IDs and no borrowed sentence audio. Every sourced headword and all 3,200 examples pass structural pinyin alignment. Review status and verification limits remain sourced.

The target `src/data/vocabulary/level-5.json` uses the existing compact-per-entry format and is **7,515,284 bytes**, below the strict 10,000,000-byte limit. Both storage writers retain that format for future imports, and the runtime data test guards the size and line count. The raw source is unchanged; the previous v1.0.1 source is archived byte-for-byte. Audio compatibility is checksum-bound to the new handoff after validating every exact ID/headword/reading. See [the import audit](../../reports/hsk-level5-1.0.5-import.json).

The revised examples add 灌 and 骤 beyond prior vocabulary font coverage. Both vocabulary font families include verified public slices for these two exact code points; [the font audit](../../reports/hsk-level5-1.0.5-fonts.json) records the URLs and checksums. No vocabulary text is sent in font requests.

## Level 6 v0.1.0 draft completion

The supplied first 100 entries (3601–3700), including all 200 examples and metadata,
remain unchanged. The completed file adds IDs 3701–5400 with exact headwords,
readings, original POS labels and homograph suffixes from the
[checksum-bound transcription](../data/hsk-level6/README.md). The shared topics,
subtopics and POS taxonomy remain unchanged; added classifications are drafts.

Each added entry has two distinct examples ordered as `conversational` /
`neutral_spoken`, then `written` / `plain_written`, with Hanzi, assisted pinyin and
English. The 3,400 added examples comprise 1,793 newly authored contexts, 188 exact
Chinese/English examples from earlier HSK handoffs, and 1,419 exact Tatoeba
Chinese/direct-English pairs. Source examples retain individual attribution and
licensing; their style labels are editorial selections. Reused sentence pinyin is
resegmented for this draft and is not claimed as a corpus recording. The added
1,700 meanings are POS-focused CC-CEDICT adaptations under CC BY-SA 4.0, with exact
dictionary evidence and its source checksum on every entry.

Run `node scripts/validate-hsk-level6.mjs --source importer/hsk/hsk3_level6_0.1.0.json` from the repository root. It verifies all
1,800 source tuples, the original 100-entry checksum, taxonomy references, ordered
example pairs, dictionary evidence and earlier-handoff text, and 5,400 structural
pinyin alignments. Corpus text, author and direct-link matches were separately
checked against the pinned local exports. Native language review, contextual
polyphony/sandhi review and strict HSK vocabulary-boundary certification remain
outstanding. The official PDF has not been independently retranscribed. This
completion does not change application vocabulary, audio or earlier-level inputs;
the Level 1–5 import CLIs still reject Level 6.

## Level 6 v1.0.0 release

The new release incorporates all 69 accepted proposals, including the final-round
overrides, plus 635 additional contextual rewrites requested by the owner. All
693 originally flagged examples are replaced. Seventeen further examples receive
contextual pinyin corrections while retaining their Chinese and English. Every
entry keeps its exact ID, headword, lexical reading, meaning, POS and taxonomy;
the 0.1.0 baseline and review files remain unchanged.

New sentences have editorial provenance without inherited corpus IDs or audio.
The 635 additional rewrites retain a language-review-needed status, distinct from
the 69 accepted replacements. Structural checks do not certify native language
review or strict HSK vocabulary boundaries. See the [build report](../../reports/hsk-level6-1.0.0-build.md),
[before/after change sheet](../../reports/hsk-level6-1.0.0-example-changes.tsv) and
[frozen revision input guide](../data/hsk-level6/README.md).

From the repository root:

```sh
python scripts/build-hsk-level6-release.py --write
python scripts/build-hsk-level6-release.py --check
node scripts/validate-hsk-level6.mjs
node scripts/import-hsk-level6.mjs --write
```

The builder reproduces the release and audit artifacts without network access.
The validator checks all 5,400 readings, exact lexical preservation, source
checksums, review coverage and uniqueness of all 3,600 sentences. The
[application import audit](../../reports/hsk-level6-1.0.0-import.json) records two
900-entry vocabulary parts (4.87 MB and 5.00 MB), with every entry on its own
line. Existing levels and recordings remain exact; Level 6 audio is unattached.
