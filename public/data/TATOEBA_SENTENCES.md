# Sentence-specific annotations

The character detail view lazily loads `character-tatoeba-examples.json` through
`src/lib/character-tatoeba-examples.ts`. Each assignment is keyed by its exact
`Characters:<glyph>` ID. Version 2 selects 1,028 short, passing assignments from
the 1,224 reviewed first candidates. It supplements recorded vocabulary/lesson examples;
multiple examples use the shared `MoreExamples` drawer. Each sentence retains its
own attribution hint, never one combined status for the whole character.

**Learner gate:** latest review Pass; at most 20 Han characters, 40 total Chinese
characters and 180 English characters; no XXX templates, ellipses or multiline
passages. The importer and browser both enforce this. Do not render Minor Review,
Needs Fix or a stale version 1 sidecar. Those candidates stay in offline reports.
The grid index is also version 2 and exposes only eligible examples.

A longer Pass sentence may provide a short complete clause. Twelve individually
checked bilingual excerpts supply 14 assignments. Chinese and English are exact
contiguous source spans, with only terminal punctuation and initial capitalization
adjusted. Preserve full-source attribution and clearly label the displayed excerpt.
Parent review acceptance and the assistant's excerpt check remain separate metadata.

| Metadata | Frontend behavior |
| --- | --- |
| `display.marker: source_info` | Information icon beside this sentence; latest recorded review is Pass. |
| `display.marker: warning_triangle` | Offline/held candidate only. Never publish an unresolved review case as a learner example. |
| `display.label` | Import metadata label. The learner trigger says “Sentence source”; internal workflow language stays out of the popup. |
| `source.chinese`, `source.english` | Separate Tatoeba IDs, links, contributors, original text and licence for Chinese and English. Always retain both attributions. |
| `source.licenseUrl` | Link to CC BY 2.0 FR. |
| `review.status`, `latestRound`, `notes` | Latest available Chinese/English review evidence; only Pass is eligible. Preserve internally, without showing review rounds or workflow in the learner popup. A Pass does not certify pinyin, audio or the target character's dictionary sense. |
| `review.reviewer1`, `reviewer2`, `reviewer2Disposition` | Preserve earlier findings and the owner's explicit missing-Reviewer-2 inheritance rule. |
| `review.round3EvidenceIds`, `round3ReturnedForThisId` | Round 3 sentence-pair evidence can support consistent wording elsewhere. Do not claim an unreturned character-specific row was returned. |
| `editorial.chineseChanged`, `englishChanged` | Mark edited wording and expose the originals in the hint. Edited text must not look like a verbatim Tatoeba quotation. |
| `binding` | Original and displayed text hashes, exact Chinese/English sentence IDs. Never attach findings or recordings by approximate text matching. |
| `selection.originalCandidateId`, `reviewEvidenceId`, `reassigned` | Distinguish the initial candidate from a suitable replacement and retain the actual parent review ID. Never claim a newly assigned character-specific ID was externally reviewed. |
| `editorial.excerpt` | Excerpt ID, parent review/text hashes, exact Chinese/English span offsets (Unicode code points), and the separate assistant completeness/alignment check. Label as an excerpt; link the full source. IDs end with `:excerpt:<id>` to distinguish excerpts from full sentences. |
| `pinyin`, `editorial.pinyin` | Source transcription provenance only. Retain the site's existing pinyin/audio presentation through `ownSentencePinyin`, `SentenceExample` and `ExamplePronunciation`; this selection fix does not replace that pipeline. |
| `editorial.pinyinWithheldAfterChineseEdit` | Withhold the original transcription after Chinese changes; don't present stale pinyin as the edited sentence's reading. |
| `audio` | Exact-sentence audio attachment when separately validated; this import has `null` throughout. Existing Mandarin TTS remains the labelled fallback where a sentence reading exists. |
| `editorial.recordingEvidence` | External recordings are permitted, but exact text and explicit per-recording permission are required. A blank licence is not permission; do not attach it for playback. |
| `review.pinyinVerified`, `targetCharacterSenseVerified`, `audioVerified` | Explicitly false in this review. Keep their scope separate from Chinese/English text review. |

Use the shared `SourceInfo` popover (`variant="info"`) and
`TatoebaSentenceSource`. `SentenceExample.sourceDetails` places the hint beside
that sentence. Preserve a separate hint for each additional example.

The small `character-sentence-index.json` supplies the grid's existing quotation-mark
availability icon for exact HSK/lesson and Tatoeba assignments. Grid markers do not
load sentence bodies. Do not list excluded candidates as available.

Generator: `python scripts/import-tatoeba-examples.py --write` (`--check` to verify).
Audit: [import report](../../reports/tatoeba-example-import.md) and
[input checksums](../../reports/tatoeba-example-import.json).
Preserved review files: [review directory](../../importer/data/tatoeba/reports/README.md).
