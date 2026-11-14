# Pinyin inventory and recordings

These generated sidecars support the Sound chart, exact-reading links, and pronunciation playback. `src/lib/pinyin-guide.ts` loads them through dynamic imports so the recording manifest stays out of initial page bundles.

| File | Shape and usage |
| --- | --- |
| `inventory.json` | `{ source, syllables }`: dictionary-attested syllable spellings and tones with source metadata. `loadSyllableInventory()` can load it alone for glyph-card Sound chart links. |
| `audio.json` | `{ source, recordings }`: recording ID to CDN URL and recorded attachment metadata. `loadPinyinData()` loads it together with the inventory and validates expected recording coverage. |

Generate both files with `python scripts/import-pinyin-audio.py <material-dir> <uploads-dir>` from the repository root. The importer verifies supplied recording bytes and checksums before accepting uploaded CDN references. External input paths remain command-line arguments; do not commit audio binaries here.

Keep exact syllable/tone bindings and all source, speaker, and license fields. Withdrawn neutral-tone recordings stay excluded; no pronunciation is inferred or substituted. See [AGENTS.md](AGENTS.md) for the local rules and [the parent data guide](../README.md) for packaging conventions.
