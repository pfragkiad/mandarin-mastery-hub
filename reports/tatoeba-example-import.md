# Tatoeba first-candidate import

Imported **1,224 exact character assignments**, covering 877 distinct
Chinese/English source pairs. Existing HSK vocabulary and lesson examples keep priority.

| Most recent recorded review | Assignments |
| --- | ---: |
| Pass | 1041 |
| Minor_Review | 109 |
| Needs_Fix | 74 |

**183 assignments show warning triangles** for unresolved findings.
These are imported learning examples with recorded review status, not universal linguistic certification.

Round 3 returned 94 character-specific IDs. Its reviewed sentence pairs cover
142 assignments in this full set; the same corrected wording is reused
with explicit evidence IDs. This does not turn unreturned character IDs into returned reviews.
Chinese changes affect 18 assignments and English changes affect
28; counts overlap. Earlier assistant-only drafts are not substituted.

Every row retains both Tatoeba sentence IDs, contributors, source links, CC BY 2.0 FR
attribution and original/display text hashes. Original text remains in the source metadata.
The popup distinguishes original text and editorial wording and shows reviewer notes.

Pinyin is recorded source transcription, never generated from the character reading.
It is withheld for changed Chinese. Source transcriptions remain unverified here.
External recordings are allowed when the exact displayed Chinese and per-recording
reuse permission are confirmed. All 94 recordings attached to these candidates
lack a reuse licence in the preserved export, so none is attached for playback.
Existing validated Mandarin TTS is available only where a source sentence reading is present.
See the [official audio attribution guidance](https://en.wiki.tatoeba.org/articles/show/faq).

Runtime: [character-tatoeba-examples.json](../public/data/character-tatoeba-examples.json),
fetched lazily by `src/lib/character-tatoeba-examples.ts`.
Audit: [input hashes and counts](tatoeba-example-import.json).
Review inputs: [preserved reports](../importer/data/tatoeba/reports/README.md).

Regenerate with `python scripts/import-tatoeba-examples.py --write`; check with `--check`.
