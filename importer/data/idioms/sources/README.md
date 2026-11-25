# Idiom translation reference inputs

Original external reference bytes used to populate the owner's 8,519-row English
review TSV. Files are offline importer inputs, never runtime vocabulary.

- `kaikki-Chinese.jsonl.gz`: complete English Wiktionary Chinese extraction from
  [Kaikki](https://kaikki.org/dictionary/Chinese/), retained locally and ignored
  because of its size. Wiktionary contributions carry CC BY-SA terms; selected
  entry evidence and attribution are retained separately.
- `petci-raw.json`: original [PETCI](https://github.com/kenantang/petci) research
  dataset. Only dictionary (`book`) translations are considered; Google/DeepL
  outputs are not treated as dictionary evidence. Repository licence: Apache 2.0.
- `wiktionary-matched.jsonl.gz`: 9,050 complete original JSONL records from the
  Kaikki download. Select an entry when its exact `word` or any explicit
  `forms[].form` equals an original supplied simplified/traditional headword.
  Retain original JSONL bytes and source order; gzip with `mtime=0`. This compact
  pinned subset is sufficient for regeneration. English Wiktionary text is
  attributed under CC BY-SA 4.0; see its [copyright terms](https://en.wiktionary.org/wiki/Wiktionary:Copyrights).
- `chinese-xinhua-idiom.json.gz`: lossless deterministic gzip wrapper around the
  original [Chinese Xinhua idiom JSON](https://github.com/pwxcoo/chinese-xinhua/blob/master/data/idiom.json),
  31,648 Chinese explanations/readings. The manifest binds both the original
  decompressed bytes and the stored gzip. Repository licence: MIT. Explanations
  and pinyin can contain errors; they are reference evidence, not approval.
- `audio-cmn-matches.json`: exact ID/headword matches against the non-truncated
  `64k/hsk` Git tree (8,596 files) of
  [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn). Contains 134 MP3 file
  paths, Git blob hashes, byte sizes and immutable raw links at the recorded
  commit. Whole-word speaker: Yue Tan. The source README declares CC BY-SA with
  no version; its licence URL is retained per recording. No listening review,
  licence-version inference, synthetic concatenation or app attachment.
- `manifest.json`: acquisition URLs, dates, sizes, response metadata and SHA-256
  checksums. Preserves the source identities needed to reproduce the lookup.

The existing pinned CC-CEDICT snapshot is reused from
`../../character-readings/cedict_1_0_ts_utf-8_mdbg.txt.gz`, under CC BY-SA 4.0.
Parent guide: [idiom review files](../README.md).

Consumer/generator: [populate-chengyu-english.py](../../../../scripts/populate-chengyu-english.py).
The manifest and population audit preserve checksums. The full Kaikki download
can be omitted once the pinned subset is present. Do not replace source inputs
with current upstream content without an explicit new snapshot and review.
