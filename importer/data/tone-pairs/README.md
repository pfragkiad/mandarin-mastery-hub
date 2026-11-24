# Tone pairs source (Pinyin sounds)

Importer-only inputs for the **Tone pairs** and **Tone changes** pages, copied byte-for-byte from the owner's prototype handoff (see [the handoff report](../../../reports/pinyin-tone-pairs-frontend-handoff.md)). The browser never reads these files; `scripts/import-tone-pairs.py` compiles them into the lazily loaded runtime sidecar [`src/data/pinyin/tone-pairs.json`](../../../src/data/pinyin/tone-pairs.json).

| File | Purpose |
| --- | --- |
| [examples.json](examples.json) | 48 examples: 40 in the 4 × 5 dictionary tone-pair matrix (two per cell, neutral second tone last) and 8 tone-change examples (3 + 3, 一, 不). Each binds one exact Vocabulary entry ID, headword, source reading and whole-word recording; dictionary tones and the *expected in speech* draft are kept separate. |
| [sources.json](sources.json) | Speaker, Shtooka collection, audio-cmn commit and licence for the recordings. |
| [manifest.json](manifest.json) | Per-recording upstream path, SHA-256 and byte size; the importer checks each against the word card's existing CDN recording. |
| [upstream-README.md](upstream-README.md) | The original audio-cmn README (attribution). |
| [LICENSES.md](LICENSES.md), [cc-by-sa-3.0-us-legalcode.html](cc-by-sa-3.0-us-legalcode.html) | Licence notices (CC BY-SA 3.0 US, © 2009 Yue Tan / Shtooka). |

Run from the repository root:

- `python3 scripts/import-tone-pairs.py --write` — validate and regenerate the sidecar.
- `python3 scripts/import-tone-pairs.py --check` — verify the committed sidecar is current.
- `python3 scripts/import-tone-pairs.py --check --verify-cdn` — also download each CDN recording and compare its SHA-256 with the manifest.

The importer fails when a headword, reading, Vocabulary entry or CDN recording no longer matches exactly, when a matrix cell does not hold exactly two words, or when a tone-change example is mixed into the matrix. No MP3s live in this repository; playback uses the word cards' own CDN recordings, never TTS or joined syllables. Preserve these bytes: the generated sidecar records their checksums.
