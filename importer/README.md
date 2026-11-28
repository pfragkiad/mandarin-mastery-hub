# Importer data

Store importer-only source files under `importer/data/`, grouped by dataset. Importer scripts currently remain under `scripts/`; generated application data remains under `public/data/` or `src/data/` according to its loading method. Standalone analysis reports and notes remain under `reports/`.

The [Tatoeba review collection](data/tatoeba/README.md) preserves an official
Mandarin `cmn` snapshot, distinguishes exact OK tags from +1 user ratings, and
filters positive candidates for later linguistic review. Audio remains metadata
only and raw downloads stay local. It does not change published examples.

The owner-supplied [HSK Level 1–5 handoffs](hsk/README.md) remain under `importer/hsk/` with their original raw bytes. Their shared topic sidecar is named [hsk3_topics.json](hsk/hsk3_topics.json). `scripts/import-hsk-level1.mjs` validates 300 Level 1 entries and 600 examples; `scripts/import-hsk-level2.mjs` validates 200 Level 2 entries and 400 examples through the same boundary. Levels 3 and 4 use the same boundary for 500 and 1,000 entries. Each replaces only its selected level's study content and retains the shared v2 topic/subtopic assignments. See that guide for audit/write commands and provenance limits.

The [Level 6 1.0.1 release](hsk/hsk3_level6_1.0.1.json) contains all 1,800 headwords (IDs 3601–5400), with one conversational and one written example each. It retains the reviewed 1.0.0 language content and reconciles 850 official serials to the PDF currently linked by the official HSK site. Rebuild with `python scripts/reconcile-hsk-level6-numbering.py --write` / `--check`, import with `node scripts/import-hsk-level6.mjs --write`, and validate with `node scripts/validate-hsk-level6.mjs`. The [import audit](../reports/hsk-level6-1.0.1-import.json) records two compact parts (5.13 MB and 5.26 MB), preserved UUIDs/example content and all 1,313 uploaded word recordings. Historical source references retain their version-specific IDs; current vocabulary and audio-manifest references use 1.0.1.

The [Level 2 word-audio handoff](data/hsk-audio/README.md) pins the original Shtooka metadata, exact reading matches and audio-cmn checksums. The owner-requested temporary MP3 staging has been uploaded to the Lovable CDN, attached to the 166 eligible Level 2 words and removed; see [the completed Lovable upload instructions](data/hsk-audio/LOVABLE_HANDOFF.md) for re-imports.

The [Level 7 working seed](hsk/hsk3_level7_0.0.1.json) preserves the current
official syllabus's shared **Levels 7–9** band: all 5,600 rows, serials 5401–11000,
with readings, raw POS and PDF page references. It contains no invented separate
Level 7 allocation, English glosses or examples. Generate/check with
`python scripts/prepare-hsk-level7.py --write` / `--check`; see the
[official-source guide](data/hsk-level7/README.md) and
[source/Level 6 numbering audit](../reports/hsk-level7-0.0.1-official-source-audit.md).

The [tone pairs source](data/tone-pairs/README.md) pins the 48 Tone pairs / Tone changes examples, their Shtooka recording checksums and licence notices; `scripts/import-tone-pairs.py` compiles them into `src/data/pinyin/tone-pairs.json` and verifies every word card and CDN recording matches exactly.

## Radical identities

For component reading/meaning proposals, follow the
[component metadata patch guide](data/components/README.md). It preserves the supplied
handoff and defines exact-record review, source evidence, shared presentation/family
fallback rules and validation. Five explicitly selected Unicode-backed family
identities are imported by `scripts/import-radical-identities.py`; 龶 has a separate
attributed descriptive label. A separate four-record form-reference review compiles
meaning-first variant presentation and related-record context through
`scripts/import-component-form-references.py`. The remaining suggestions are not automatically imported.

`scripts/import-radical-identities.py` reads these pinned inputs from `importer/data/radical-identities/`:

| File | Purpose |
| --- | --- |
| [review.json](data/radical-identities/review.json) | Supplied mirror audit containing exact reviewed glyph/symbol identities and provenance. Its raw bytes determine the generated `coverage.auditSha256`. |
| [CJKRadicals.txt](data/radical-identities/CJKRadicals.txt) | Pinned Unicode 17 CJK radical identities. Its raw bytes determine a generated source checksum. |
| [NamesList-supplement.txt](data/radical-identities/NamesList-supplement.txt) | Pinned Unicode radical-supplement naming records, also checksum-bound. |
| [Unihan-kRSUnicode-supplement.txt](data/radical-identities/Unihan-kRSUnicode-supplement.txt) | Recorded residual-zero radical assignments, including its upstream Unihan checksum. |

These four pinned inputs previously lived under `scripts/data/radical-identities/` and now live together under `importer/data/radical-identities/`. Relocation preserves file bytes and provenance. Preserve encoding and line endings when handling checksum-bound sources.

The same directory additionally pins Unicode 17's `EquivalentUnifiedIdeograph.txt`.
The importer uses only the pairs selected by the component metadata review and
validates their exact symbol families; NamesList cross-references alone remain
insufficient. `python scripts/import-radical-identities.py --check` verifies output
without writing it.

Run `python scripts/import-radical-identities.py` from the repository root to generate `public/data/radical-identities.json`. The script also reads the current character/radical rows, shared catalogue metadata, and the radical-stroke sidecar. It never serves these importer-only inputs to the browser.

## Etymology sources

The initial [etymology collection](data/etymology/README.md) contains pinned Howell
text/PDF material and Shuowen's original JSON source archive, with their license
notices, revision identities and a JSON Schema for the checksum manifest. Root
`dataset_metadata` embeds full source-specific notices, packaging version and the
actual acquisition date; `--refresh-metadata` regenerates it from verified inputs. Run
`python scripts/download-etymology-sources.py --download` to acquire the snapshots
or `--check` to verify existing files without network access. They are importer-only
inputs. The complementary [runtime handoff](../public/data/etymology/README.md)
is generated by `python scripts/import-etymology.py --write` and verified with
`--check`; its audit lives under `reports/`. It preserves source identities and
exact glyph links without changing the catalogue or introducing a hosted database.
The shared frontend adapter loads the index and selected shards lazily. Separate
[English Shuowen drafts](data/etymology/translations/README.md) bind to each
original Chinese entry and remain visibly labeled AI-generated and unreviewed.

## Shared runtime sources

Some importer dependencies also serve the application and retain their existing locations:

- `public/data/radical-families-source.json` is read by the stroke and supplementary-outline importers, linked from radical-family details for source records and license notices, and recorded in stroke-sidecar provenance.
- `public/data/radical_variant_etymology_audit.json` is fetched lazily by variant details and read by the contextual-identity importer and provenance tests.
- Generated catalogue rows, metadata, and sidecars are read by both the app and later import steps. They remain in their runtime data directories.

Do not move shared runtime files merely because an importer also reads them. For future importer-only inputs, use `importer/data/<dataset>/` and update the importer, documentation, and source checksum references together. External source paths explicitly supplied through command-line arguments remain supported without copying those files into the repository.

Level 5 terms and the owner-approved rewritten v1.0.1 draft examples are imported by `scripts/import-hsk-level5.mjs`. Level 1 now uses v1.7.1. Verified word-audio ZIPs are generated outside the repository by `scripts/prepare-hsk-word-audio.py`, with manifests in [the audio metadata directory](data/hsk-audio/README.md).

The [lesson handoff guide](data/lessons/README.md) records the owner-supplied HSK Level 1 v3.2.0 lesson bundle (vocabulary v1.7.1) and canonical Core v3.2.0 Project Sources. Their import scripts validate exact lesson/vocabulary identities and preserve the original ZIPs and extracted source bytes.
