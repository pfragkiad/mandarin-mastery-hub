# Staged Level 2 word recordings

**Owner-requested temporary handoff for Lovable CDN upload.** These 165 original audio-cmn MP3s cover 166 exact Level 2 entries; the two 花 entries share one source recording. Filenames are the pinned Git blob IDs, so duplicate spellings/readings cannot overwrite different recordings. Each MP3's byte count and SHA-256 are recorded in [../level2-manifest.json](../level2-manifest.json).

Produced by `python scripts/import-hsk-level2-audio.py --stage --cache <verified-download-directory>`. Consumed only by `scripts/import-hsk-level2-audio.py --upload`; browser modules must never import or serve this directory. No synthetic, joined-syllable or sentence audio is included.

Source: [hugolpz/audio-cmn, pinned commit f759a0f18f27690742957619e1248ed91e9b3f2c](https://github.com/hugolpz/audio-cmn/tree/f759a0f18f27690742957619e1248ed91e9b3f2c), `64k/hsk`, from the Shtooka `cmn-caen-tan` collection. © 2009 Yue Tan, **CC BY-SA 3.0 US**; [preserved original notice](../cmn-caen-tan-readme.txt).

See [the Lovable handoff](../LOVABLE_HANDOFF.md) for upload/import instructions. After CDN upload and verification, these temporary importer-only media files can be removed in a normal follow-up commit; runtime data must retain only CDN URLs and attribution. This directory is an explicit exception requested by the owner for this handoff, not a change to the normal no-media-in-repository policy.
