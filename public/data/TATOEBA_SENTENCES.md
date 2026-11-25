# Sentence-specific annotations

The character detail view lazily loads `character-tatoeba-examples.json` through
`src/lib/character-tatoeba-examples.ts`. Each assignment is keyed by its exact
`Characters:<glyph>` ID. This first import contains 1,224 assignments to 877
Chinese/English source pairs. It supplements recorded vocabulary/lesson examples;
multiple examples use the shared `MoreExamples` drawer. Each sentence retains its
own attribution and review hint, never one combined status for the whole character.

| Metadata | Frontend behavior |
| --- | --- |
| `display.marker: source_info` | Information icon beside this sentence; latest recorded review is Pass. |
| `display.marker: warning_triangle` | Warning triangle beside this sentence; an unresolved Minor Review or Needs Fix remains. |
| `display.label` | Accessible label and hover title on the source button. |
| `source.chinese`, `source.english` | Separate Tatoeba IDs, links, contributors, original text and licence for Chinese and English. Always retain both attributions. |
| `source.licenseUrl` | Link to CC BY 2.0 FR. |
| `review.status`, `latestRound`, `notes` | Latest available finding for Chinese quality/English fidelity. Show the actual note. A Pass does not certify pinyin, audio or the target character's dictionary sense. |
| `review.reviewer1`, `reviewer2`, `reviewer2Disposition` | Preserve earlier findings and the owner's explicit missing-Reviewer-2 inheritance rule. |
| `review.round3EvidenceIds`, `round3ReturnedForThisId` | Round 3 sentence-pair evidence can support consistent wording elsewhere. Do not claim an unreturned character-specific row was returned. |
| `editorial.chineseChanged`, `englishChanged` | Mark edited wording and expose the originals in the hint. Edited text must not look like a verbatim Tatoeba quotation. |
| `binding` | Original and displayed text hashes, exact Chinese/English sentence IDs. Never attach findings or recordings by approximate text matching. |
| `pinyin`, `editorial.pinyin` | Source-recorded sentence reading and transcription provenance. Format through the site's existing pinyin helper, render/pair/play through `SentenceExample` and `ExamplePronunciation`. Never create the sentence reading by joining isolated character readings. |
| `editorial.pinyinWithheldAfterChineseEdit` | Withhold the original transcription after Chinese changes; don't present stale pinyin as the edited sentence's reading. |
| `audio` | Exact-sentence audio attachment when separately validated; this import has `null` throughout. Existing Mandarin TTS remains the labelled fallback where a sentence reading exists. |
| `editorial.recordingEvidence` | External recordings are permitted, but exact text and explicit per-recording permission are required. A blank licence is not permission; do not attach it for playback. |
| `review.pinyinVerified`, `targetCharacterSenseVerified`, `audioVerified` | Explicitly false in this review. Keep their scope separate from Chinese/English text review. |

Use the shared `SourceInfo` popover (`variant="info"` / `"warning"`) and
`TatoebaSentenceSource`. `SentenceExample.sourceDetails` places the hint beside
that sentence. Preserve a separate hint for each additional example.

The small `character-sentence-index.json` supplies the grid's existing quotation-mark
availability icon for exact HSK/lesson and Tatoeba assignments. Grid markers do not
load sentence bodies or imply approval.

Generator: `python scripts/import-tatoeba-examples.py --write` (`--check` to verify).
Audit: [import report](../../reports/tatoeba-example-import.md) and
[input checksums](../../reports/tatoeba-example-import.json).
Preserved review files: [review directory](../../importer/data/tatoeba/reports/README.md).
