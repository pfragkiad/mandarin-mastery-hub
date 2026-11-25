# Tatoeba teaching-example selection

Selected **1,028 short, passing character examples** from the 1,224 reviewed
first candidates, covering 748 Chinese/English source pairs.
Existing vocabulary and lesson examples stay first and retain their own annotations.

## Learner suitability gate

- Latest review must be **Pass**. Minor Review and Needs Fix remain offline.
- At most **20 Han characters**, 40 total Chinese-line characters and 180 English characters.
- No unfinished XXX templates, ellipses or multiline passages.
- A longer Pass source may supply an individually checked complete clause with
  an exact matching English span. Preserve both full-source links, span offsets,
  parent text hashes and the separate assistant excerpt check. Never crop by length.

Kept 969 first choices and replaced 59 with suitable
already-reviewed sentences containing the same exact character. **196 characters
remain without a suitable Tatoeba example**; a gap is preferable to an unresolved or long passage.
The 255 excluded first candidates and replacement decisions are preserved in the
[offline audit](tatoeba-example-import.json), including the long Biden sentence for 州.
The selection includes **14 assignments from 12 checked excerpts**.
Only terminal punctuation and initial English capitalization change; no lexical text is invented.

| Most recent recorded review | Assignments |
| --- | ---: |
| Pass | 1028 |

No unresolved review cases are published as learning examples. The browser repeats
the suitability gate, rejecting stale pre-filter data and overlong/flagged rows.
Public source hints retain attribution and original wording after edits, without
exposing internal review workflow.

Round 3 returned 94 character-specific IDs. Its reviewed sentence pairs cover
107 selected assignments; the same corrected wording is reused
with explicit evidence IDs. This does not turn unreturned character IDs into returned reviews.
Chinese changes affect 15 assignments and English changes affect
21; counts overlap. Earlier assistant-only drafts are not substituted.

Every row retains both Tatoeba sentence IDs, contributors, source links, CC BY 2.0 FR
attribution and original/display text hashes. Original text remains in the source metadata.
The popup distinguishes original text and editorial wording and shows reviewer notes.

Source pinyin transcriptions remain preserved as provenance and are withheld after
Chinese edits. The frontend retains the site's current pinyin/audio presentation.
External recordings are allowed when the exact displayed Chinese and per-recording
reuse permission are confirmed. All 85 recordings attached to these candidates
lack a reuse licence in the preserved export, so none is attached for playback.
Existing validated Mandarin TTS is available only where a source sentence reading is present.
See the [official audio attribution guidance](https://en.wiki.tatoeba.org/articles/show/faq).

Runtime: [character-tatoeba-examples.json](../public/data/character-tatoeba-examples.json),
fetched lazily by `src/lib/character-tatoeba-examples.ts`.
Audit: [input hashes and counts](tatoeba-example-import.json).
Review inputs: [preserved reports](../importer/data/tatoeba/reports/README.md).

Regenerate with `python scripts/import-tatoeba-examples.py --write`; check with `--check`.
