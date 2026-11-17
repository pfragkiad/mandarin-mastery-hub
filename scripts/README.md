# Importers and font builders

Run scripts from the repository root. Importer-only pinned inputs belong in [importer/data/](../importer/data/README.md); runtime outputs belong in [public/data/](../public/data/README.md) or [src/data/](../src/data/README.md). Standalone analysis outputs belong in [reports/](../reports/README.md). Read [catalog.md](../public/data/catalog.md) before changing catalogue inputs or output schemas.

| Script | Usage and output |
| --- | --- |
| `export-catalog-ids.mjs` | Run `node scripts/export-catalog-ids.mjs` to write `public/data/catalog_ids.json`; add `--check` to verify it without writing. Joins shared `catalog.json` metadata with section files and recorded radical sidecars, then uses the shared library adapter to export exact selectable Characters IDs. Uses the existing toolchain's `jiti` loader; no network access required. |
| `import-radical-identities.py` | Reads the pinned inputs under `importer/data/radical-identities/` plus current catalogue records; writes exact sourced `public/data/radical-identities.json`. |
| `import-radical-strokes.ts` | Run with `bun scripts/import-radical-strokes.ts`. Reads `radicals.json`, `strokes.json`, and the shared versioned radical-family source; writes `public/data/radical-strokes.json`. |
| `import-component-radicals.py` | Takes a supplied Unihan IRG source path; updates shared `catalog.json` component radical assignments from recorded kRSUnicode values. |
| `import-character-variants.py` | Takes a supplied Unihan variants path; writes the legacy `public/data/character-variants.json` export. It does not replace the active owner-curated `character-variants-v1.4.0.json`. |
| `import-character-enrichment.py` | Takes a supplied enrichment handoff JSON; splits it into public per-glyph sidecars and a manifest, checking catalogue-tree compatibility. |
| `import-radical-contextual-identities.py` | Extracts reviewed contextual identities from the runtime etymology audit into `src/data/radical-contextual-identities.json`. |
| `import-supplementary-outlines.py` | Downloads only explicitly owner-reviewed outlines and writes public geometry plus the small `src/data` manifest. |
| `import-babelstone-components.py` | Takes a supplied IDS text path; writes numbered component definitions to `src/data/babelstone-components.json`. |
| `import-usage-order.py` | Takes a usage-order directory and optional component-classes directory; writes sourced ranks and exposure statistics to `public/data/usage-order.json`. |
| `import-pinyin-audio.py` | Takes supplied material and upload-manifest directories; verifies recordings and writes CDN-reference sidecars under `src/data/pinyin/`. |
| `import-hsk-level1.mjs` | Audits the supplied versioned JSON and topics sidecar; `--write` replaces every Level 1 record, including removing legacy unofficial phrases, with exact identities/audio retained and validated pinyin tokens. See [the HSK source guide](../importer/hsk/README.md). Run `node --test scripts/import-hsk-level1.test.mjs` for importer boundary checks. |
| `import-hsk-phrases.py` | Legacy XLSX importer for the former unofficial practice phrases; not compatible with the v1.6.0 JSON handoff. Running it explicitly re-adds that legacy phrase set. Requires `openpyxl`; see its argument parser for paths. |
| `build-vocabulary-fonts.py` | Builds the vocabulary's self-hosted font subsets from the recorded web-font designs. Requires fontTools and network access. |
| `build-supplement-fonts.py` | Builds extra font coverage for recorded code points outside the Google Fonts slices. Requires fontTools and network access. |
| `build-finder-medians.py` | Run `python3 scripts/build-finder-medians.py` to write `public/data/finder-medians.json` for the Hanzi finder. Downloads hanzi-writer-data 2.0.1 from npm (checksum-pinned), packs only recorded medians for exact catalogue glyphs, and lists glyphs without geometry under `missing`. Requires network access. Rerun when the catalogue gains glyphs. |

Generation can overwrite its documented output files. Review the input version, intended output, and resulting diff. Preserve exact glyph identities, nulls, record IDs, source provenance, and checksum-bound bytes. Media exports contain CDN URLs and attribution; do not add audio binaries to the repository.

Validate changed outputs with the relevant data, pronunciation, geometry, and font-coverage tests. For the full app run `npm test` and `npx tsc --noEmit`; Windows PowerShell may require `npm.cmd` and `npx.cmd`. Importer output comparisons should use temporary output directories when checking a path-only change.

- `import-component-strokes.py` — fills `public/data/components.json` rows that record no stroke count with Unicode Unihan 17.0.0 `kTotalStrokes` (single-valued only); radical supplement symbols Unihan doesn't cover stay uncounted. Run before `import-radical-strokes.ts`, which uses these counts for family forms its source leaves at null.
