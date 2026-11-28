# Missing Mandarin audio package

The [second-round package](v2/README.md) is preserved separately, with its own screening decisions, CDN pointers and report; first-round evidence below remains unchanged.

Owner-supplied `missing-audio-package.zip` (generated 2026-11-28), preserved here without its 318 media files. `manifest.json`, `ATTRIBUTION.md`, `PACKAGE_README.md` (the package's original `README.md`) and `notices/` retain their original bytes. The manifest binds current post-migration vocabulary UUIDs/official HSK IDs/readings and character `(glyph, reading)` slots to candidate recordings, checksums and source attribution.

## Import and listening-review boundary

`scripts/import-missing-audio.py` independently re-reads the preserved Shtooka indexes and verifies exact headword + reading tags. It attaches two disjoint groups:

- **8 source-index exact vocabulary records** (7 unique clips; 为 wéi shares one clip across Levels 4 and 5): 了 le, 啊 a, 长 cháng, 地 de, 得 de, 得 dé and 为 wéi.
- **196 listening-reviewed vocabulary records**, selected from 217 candidates by `listening-review.json`: 14 / 9 / 16 / 48 / 44 / 65 across Levels 1–6. The 21 records without a pronunciation match remain unattached.

The review sidecar preserves all 296 candidate clips' 392 accept/reject outcomes, ordered ASR transcripts and pronunciation comparisons. It uses strict default readings, allows documented 一/不 sandhi and neutral/citation notation, accepts homophones only when their spoken syllables and tones match, and never uses an alternate dictionary reading to pass a homograph. Both 呀 candidates were rejected as yā/yà rather than neutral ya.

Four exact neutral character slots are covered as follows: 了 le, 啊 a and 啦 la reuse exact whole-word vocabulary recordings; standalone 哇 wa is bound in `public/data/catalog.json` because its Vocabulary record is the different reading 哇 wā. The neutral sidecar contains thirteen recordings: the ten above plus exact reviewed 过 guo, 头 tou and 子 zi.

The review also selects four Yue Tan yán clips and replaces the reported-wrong `cmn-syl-yan2` binding at exactly 25 glyph/reading slots. The old asset and provenance remain recorded, but no glyph binding uses it. No other character recording is replaced.

`uploads.json` is the durable Git-blob → Lovable CDN pointer map. It contains no audio. Existing exact recordings are reused rather than replaced. No HSK ID, UUID, entry order, meaning, example or lexical reading is changed. `reports/missing-audio-import.json` lists all 318 supplied files, their references, review outcomes, accept/reject/alternative status and actual CDN attachments.

From the repository root, with the ZIP extracted outside the repository:

```sh
python scripts/import-missing-audio.py --package /tmp/missing-audio-package --verify-cache
python scripts/import-missing-audio.py --package /tmp/missing-audio-package --upload --uploads /tmp/missing-audio-uploads
# Merge the returned <gitBlob>.json pointers into uploads.json, then:
python scripts/import-missing-audio.py --write --report reports/missing-audio-import.json
python scripts/import-neutral-pinyin-audio.py --write
python scripts/import-missing-audio.test.py
```

The neutral generator independently checks the preserved `cmn-balm-hsk1` and `cmn-caen-tan` source indexes. Runtime data stores CDN URLs plus source/speaker/license, never media binaries. Repeat imports and both official-ID validators preserve all additions and every older attachment.
