# Upload and attach Level 2 word audio

**Status: completed.** 164 unique clips were uploaded once each, all 166 eligible entries are attached (`changed: 165`, repeat `changed: 0`), every URL matched its SHA-256 and playback was verified in the app. The staged `recordings/` MP3s were then removed; a re-import needs a fresh external `--cache` (`--prepare`).

The owner requested these files be staged in the importer directory so Lovable can perform the CDN uploads. The preparation and exact-reading audit are complete. Do not regenerate or replace vocabulary content.

1. Read [README.md](README.md) and [the coverage report](../../../reports/hsk-level2-audio.md).
2. In the authenticated Lovable environment, run from the repository root:

   ```sh
   python3 scripts/import-hsk-level2-audio.py --upload --cache importer/data/hsk-audio/recordings --uploads /tmp/mandarin-hsk2-audio-uploads
   python3 scripts/import-hsk-level2-audio.py --uploads /tmp/mandarin-hsk2-audio-uploads --write --report reports/hsk-level2-audio.json
   ```

   `--upload` uses the existing `lovable-assets create` CLI. It verifies every staged file's size/SHA-256 before uploading. Output pointer JSONs stay in the temporary uploads directory. Already available exact word attachments and validated pointers are skipped on retries. The expected initial upload count is 164 unique clips for 165 pending entries: 点 already reuses its exact existing Level 1 recording, and the two 花 entries share one clip.

3. Confirm the report has `attached: 166`, no pending uploads and `changed: 165` for the first complete import after the 点 attachment. Repeat imports must report `changed: 0`. The 13 `reading_mismatch` and 21 `missing` entries intentionally remain unattached; never attach a same-glyph clip with a different tone or neutral-tone pattern.
4. Verify the uploaded asset URLs play in the project. The application uses `audio.source`, `audio.license` and `recordingKind: word` through the shared audio pipeline. All 400 Level 2 example sentences stay without recordings; this source contains word audio only.
5. Run:

   ```sh
   python3 scripts/import-hsk-level2-audio.test.py
   node --test scripts/import-hsk-level1.test.mjs scripts/import-hsk-level2.test.mjs
   npm test -- src/lib/vocabulary-level1.test.ts src/lib/vocabulary-level2.test.ts src/lib/vocabulary-fonts.test.ts src/lib/audio.test.ts
   npx tsc --noEmit
   ```

6. Update the readable coverage report's upload state. Preserve the raw HSK handoffs, entry UUIDs, syllabus IDs, readings, meanings, kinds, topics, all examples, other-level entries and provenance. The importer changes only `audio` and modification timestamps on newly attached Level 2 records.
7. Commit/push the completed CDN attachments. Once playback is verified, remove the temporary MP3s in a normal follow-up commit and update both directory guides. Keep source metadata, licensing, checksums and the manifest so the audio remains auditable. Do not rewrite published history.

The 179 exact filenames initially found in audio-cmn are not all suitable: the original Shtooka metadata exposes 13 different readings, including 长 `zhǎng` versus `cháng`, 得 `děi` versus `de`, 地 `dì` versus `de`, and 过 `guò` versus neutral `guo`. The importer keeps these distinctions intact.
