# Missing Mandarin Audio Package

Generated: 2026-11-28T11:09:58.973635Z

## Coverage Summary

- **Missing vocabulary entries audited:** 1100 (out of 5,401 total)
  - `matched_exact_reading`: **8** (exact headword + pinyin verified in source index)
  - `matched_headword_needs_listening_review`: **217** (headword matched in Lingua Libre, Shtooka `cmn-balm-congcong`, or partial slash-reading in `cmn-caen-tan`; verify spoken reading/tone before attaching)
  - `uncovered`: **875** (no open-licensed human recording found in these collections)
- **Missing or quarantined character reading slots audited:** 61 across `Characters` / `Components` / `Radicals`
  - `matched_exact_reading`: **29** (includes 25 `yán` replacement candidates from Yue Tan's single-character words, plus `了 le`, `啊 a`, `哇 wa`, `啦 la`)
  - `matched_headword_needs_listening_review`: **1** (`呀 ya` in Lingua Libre)
  - `uncovered`: **31** (remaining neutral-tone syllables & interjections `yō`, `ḿ`, `ǹg`)
- **Unique audio files packaged:** **318**

## Contents

- `manifest.json` — Complete machine-readable index binding every missing word UUID/HSK ID and character `(glyph, reading)` slot to candidate clips, checksums (`sha256`, `sha1`, `gitBlob`), and exact provenance.
- `ATTRIBUTION.md` — Full collection notices and per-clip speaker/license table.
- `notices/` — Original upstream `readme.txt` and `index.xml` snapshots for Shtooka collections.
- `recordings/` — Checksum-verified audio files grouped by source.

## Important Rules

1. Clips with `status: "matched_headword_needs_listening_review"` come from sources whose metadata does not disambiguate pinyin tones/polyphones (`cmn-balm-congcong` and Lingua Libre) or only cover one reading of a multi-reading word (`熟 shú/shóu`). Listen before attaching.
2. Quarantined `yán` (`cmn-syl-yan2`, reported as saying `mén`) can be replaced after listening to the included Yue Tan `言` / `盐` / `严` / `沿` clips.
3. Uncovered entries should not borrow recordings from another tone or syllable.
