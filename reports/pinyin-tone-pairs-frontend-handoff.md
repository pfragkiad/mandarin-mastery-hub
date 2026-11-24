# Pinyin sounds: frontend prototype and recording handoff

Prepared 2026-11-24. This is a local review handoff requested by the owner; no production route, vocabulary record, audio attachment or navigation has been changed.

## What to send to the other machine

Send **`pinyin-sounds-prototype-with-audio.zip`**, generated outside the repository. It is self-contained: the receiving team does not need access to this computer, its temporary cache, a package manager, or a development server to preview playback.

1. Extract the **entire** ZIP, preserving the `audio/` subdirectory.
2. Open `index.html` in Chrome, Edge, Firefox or Safari. All 48 actual whole-word MP3s are included; playback uses local files in the ZIP edition.
3. Read this file and `LICENSES.md`. The interface is a prototype and spoken-tone labels need listening review.
4. For app integration use the exact `audio.cdnUrl` values in `DOWNLOAD-MANIFEST.json` after checking them against current vocabulary. All 48 have existing exact-record attachments. Do not upload duplicate media merely to support the prototype.
5. Keep `NOTICE.txt`, individual source/license metadata and the original recording identities with redistributed assets.

The package contains `index.html`, `styles.css`, `app.js`, `data.js`, 48 files under `audio/`, `DOWNLOAD-MANIFEST.json`, `SOURCES.json`, `NOTICE.txt`, `LICENSES.md`, `FRONTEND-HANDOFF.md`, `START-HERE.txt` and `source-material/` with curated inputs, source register, manifest, pinned upstream README, exact original Shtooka XML/notice and a copy of the full license. The manifest binds downloaded bytes to SHA-256. No audio binaries are stored in Git.

## Proposed navigation

Use **Pinyin sounds** as a common category, with **Sound chart**, **Tone pairs**, and **Tone changes (sandhi)**. Retain the current Sound chart URL `/pinyin`; do not break glyph-card links or existing games. Proposed new TanStack leaf routes: `/pinyin/tone-pairs` and `/pinyin/tone-changes`, matching the existing `pinyin_.tone-quiz.tsx` leaf-route convention. Keep shared navigation/state at the existing root shell. The static demo lives at `/prototypes/pinyin-sounds/` when served by this checkout.

The Sound chart tab and each dictionary-syllable chip point to the actual app contract `/pinyin?s=<base>&t=<1..5>`. Use `soundChartTarget` and the shared SoundChartLink/trail behavior in production; draft expected spoken readings must not replace lexical links. Exact vocabulary links use `/vocabulary?word=<entryId>`. Offline file previews show a note instead of pretending the app is installed; serve the folder under the app origin to follow these links.

## Prototype behavior to retain

- A 4 × 5 matrix: first dictionary tone 1–4, second tone 1–4 or neutral. There are two recorded words in each cell: 40 matrix examples. Neutral is stored as `5`, displayed as “neutral” (a dot in compact cells).
- 3+3 stays classified as dictionary 3+3. A separate **expected in speech** draft label shows 2+3; neither changes source pinyin nor exact record identities. The two third-tone examples also appear under Tone changes.
- Eight further examples cover 一 before tones 1, 2, 3 and 4, and 不 with a tone-4 contrast plus a non-changing tone-2 example. These are separate from ordinary matrix groups. Counting/ordinal exceptions and longer third-tone phrasing are called out.
- One speaker plays one **whole-word recording**. Normal/0.8×, Stop, Next word, selection and Listen first/Reveal work. Next changes selection without autoplay. There is no TTS, syllable concatenation, pitch scoring, invented contour or auto-fallback after failure.
- Source details retain exact source reading, speaker, license, original pinned MP3 URL and SHA-256. The expected spoken pinyin at the top is visibly a draft. Playing an MP3 does not certify its sandhi realization.
- The prototype hash restores view, rule, pair, exact selected source ID, reveal mode and speed; Back/Forward restores them and cancels active playback. Port these fields to validated TanStack search parameters. Use shared draft filter forms if adding filters; do not make applying future pool filters reset active game decks.
- The selected word/card and all word names are hidden in Listen first. This is a shadowing aid, not a scored tone-identification quiz: the selected matrix/rule remains visible.
- Buttons and links are independent, native, keyboard accessible, with focus styling and a live playback status. Switching selection/navigation stops current audio. Use the app's shared theme and controls when porting.

## Data contract

Read `DOWNLOAD-MANIFEST.json` / `data.js`. Every example has:

| Field | Meaning |
| --- | --- |
| `id`, `sourceFileIds`, `headword`, `sourceReading` | Exact Shtooka identity/text/reading. Never rewrite them to match teaching labels. |
| `citationSyllables`, `citationTones`, `pair` | Separately authored dictionary teaching labels; neutral = 5. |
| `expectedSpokenSyllables`, `expectedSpokenTones` | Contextual teaching draft, **not measured or listening-approved**. |
| `rule`, `inPairMatrix` | `third`, `yi`, `bu` or null; 一/不 examples excluded from ordinary matrix. |
| `vocabularyEntryId` | Existing exact headword/reading match. Resolve independently of library filters; preserve the ID. |
| `audio.cdnUrl` | Existing exact-reading recording pointer from current vocabulary; retain its source/license. Relative `/__l5e/…` URLs belong to the application origin. |
| `audio.upstreamUrl`, `repositoryPath` | Pinned upstream recording identity. Preview/acquisition only; production uses the existing CDN attachment. |
| `audio.localPath`, `bytes`, `sha256` | Bundle-relative original MP3 and byte verification. ZIP edition uses these; tracked demo uses upstream URL. |
| `reviewStatus` | `editorial_draft_audio_not_listening_reviewed`. No code path should present this as linguistic approval. |

All 48 currently have exact vocabulary IDs/CDN pointers. Eighteen also match checksums independently recorded in the Level 2–5 audio import manifests; the remaining downloaded files are pinned by this handoff. Compare IDs/readings/source at integration time rather than relying indefinitely on this snapshot. Source/citation pinyin are separate because source spelling can already include sandhi. No audio is inherited by component names or individual characters.

## Licensing decision

Included audio comes only from **Yue Tan / Shtooka cmn-caen-tan**, © 2009 Yue Tan, **CC BY-SA 3.0 US**, distributed as audio-cmn MP3 derivatives. The exact original collection notice and index are preserved; audio-cmn's pinned README identifies the speaker and CC BY-SA source. The official license permits commercial sharing/adaptation under its conditions: https://creativecommons.org/licenses/by-sa/3.0/us/ . Preserve attribution, source/license links, change notices and ShareAlike obligations for adaptations; do not impose additional restrictions on the licensed material. See `LICENSES.md` and the full legal text.

Yoyo Chinese, EdUHK, Sinosplice and Pīnyīn Explorer are **reference links only**. Their recordings, lists, code, screenshots and teaching prose were not acquired for this handoff. We have not claimed redistribution clearance for them. This is documented license evidence for the included source, not a warranty covering every future use or third-party right.

## Integration acceptance

Use the existing `src/lib/audio.ts` pipeline with the exact recording attachment and shared source credits; load the small tone-pair sidecar lazily. Do not bundle the full vocabulary, import manifests or 48 MP3s into a route bundle. Preserve recordings as CDN URLs in runtime JSON and keep offline source material under `importer/data/`. Keep existing `/pinyin` chart, quiz navigation and exact selected syllable behavior working.

Before release, listen-review each example and mark its status explicitly; correct teaching fields without altering original source text/reading. Test 3+3 versus 2+3 grouping, 一/不 examples, neutral endings, exact vocabulary IDs, missing/failed audio without fallback, responsive layout, keyboard focus, stop-on-navigation, history restoration and Sound chart return behavior. Do not ship the prototype's raw GitHub playback or blanket the page as reviewed.

## Verification of this handoff

The 48 downloaded MP3s passed byte-count/SHA-256 and media-format/duration inspection; together they contain about 63 seconds of isolated whole-word audio. This is a small review sample, not a complete course. All ZIP entries passed CRC integrity checks. A virtual-DOM interaction check covered all 20 matrix cells, neutral endings, sandhi/source-reading separation, exact syllable links, reveal, offline audio-path selection, speed, stop-on-selection, Back restoration and playback failure without fallback. JavaScript syntax and generated-data checks passed. Optional `python verify-audio.py` checks the receiving machine's extracted MP3s.

Visual browser QA and human listening review are **not complete**. Automatic approval review rejected inspection of the available Chrome window because it contained unrelated private content; no private browser state was read. The virtual-DOM playback test uses an audio stub and does not claim browser playback verification. Preview the extracted package before porting or release.

## Reproduce

From the repository root:

```powershell
python scripts/prepare-tone-pairs-prototype.py --download --cache "$env:TEMP/mandarin-tone-pairs-handoff/audio" --package "$env:TEMP/mandarin-tone-pairs-handoff/pinyin-sounds-prototype-with-audio.zip"
python scripts/prepare-tone-pairs-prototype.py --check --cache "$env:TEMP/mandarin-tone-pairs-handoff/audio"
node --check public/prototypes/pinyin-sounds/app.js
```

Both cache and ZIP paths must resolve outside the repository. Re-running checks exact source/index/notice/spec hashes and all audio checksums; ZIP integrity and browser playback are verified separately. Runtime application datasets remain untouched.
