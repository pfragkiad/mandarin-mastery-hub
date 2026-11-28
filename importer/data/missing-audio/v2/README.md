# Second missing-audio package

The owner's `missing-audio-package-v2.zip`, based on `15693cf2`, contains 79 MP3 clips for 65 word candidates and three character-reading candidates. `manifest.json`, `ATTRIBUTION.md`, `PACKAGE_README.md` and `notices/` preserve the supplied bytes; media stays outside Git.

`review.json` preserves ordered automatic transcriptions for all clips and 25 selected whole words whose pinned Shtooka source readings differ only in initial 一/不 citation/sandhi notation. This is source/automatic-speech screening, **not native-speaker listening or acoustic tone certification**. Neutral/citation differences, partial `熟 shú/shóu`, ambiguous interjections and 一身's repeated `一生` transcript remain held. No character recordings are attached.

`uploads.json` stores the selected clips' Git-blob-keyed Lovable CDN pointers. The importer reuses the existing CDN validator and split vocabulary writer; no UUID, HSK ID, reading, meaning, example, old attachment or catalogue data changes.

```sh
python scripts/import-missing-audio-v2.py --package /tmp/missing-audio-v2 --upload --write
python scripts/import-missing-audio-v2.test.py
```

The per-file report is [reports/missing-audio-v2-import.json](../../../../reports/missing-audio-v2-import.json). It lists every clip, transcript, provenance, exact references, attachments and holds. `--report` selects another output; omitting `--write` audits without changing runtime data. The first round stays independent in the [parent directory](../README.md).