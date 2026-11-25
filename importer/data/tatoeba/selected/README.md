# Positive-marked Mandarin review candidates

Generated offline by `python scripts/prepare-tatoeba.py --filter --write` from the
checksum-bound exports in [the parent manifest](../manifest.json). Check with
`python scripts/prepare-tatoeba.py --filter --check`.

| File | Purpose |
| --- | --- |
| `ok-tagged.tsv` | All currently present Mandarin sentences with the exact **OK** tag; includes explicit holds rather than hiding conflicting evidence. |
| `ok-candidates.tsv` | OK-tagged sentences remaining after exclusions; the narrowest working set. |
| `positive-candidates.tsv` | Working set: exact OK tag or at least one +1 review, without negative ratings, unresolved attention/correction/native-check/archaic tags or entirely stale positive marks. |
| `marked-001.jsonl` … | Complete evidence for every positively marked Mandarin record, including held records. Bounded 5 MB parts; one exact source sentence ID per JSON line. Includes contributor and reviewer identities/dates, tagger evidence, self-reported Mandarin levels, raw pinyin/script conversions, direct English translations and audio licence metadata. |

The TSVs are UTF-8 spreadsheets. The `pinyin_as_exported` column preserves the
original numbered transcription; it is not silently converted or corrected.
Every sentence retains its original Chinese form. Hans/Hant conversions and
pinyin have their own reviewer fields. A sentence's OK mark does not review its
English translation, pronunciation, audio or target character sense.

Source text: **Tatoeba contributors**, [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/).
Use the sentence URL and named contributor per record for attribution. A source
owner's self-reported language level is prioritization metadata, not proof of
native-speaker status or a trusted-contributor certificate. No AI secondary
review has run; nothing here is approved or imported into the application.

Audio entries are metadata only. A blank licence does not permit reuse outside
Tatoeba; the snapshot's explicitly licensed Mandarin clips are noncommercial.
No audio binaries are downloaded, committed or attached to app records.

## Frontend marker metadata

Each Mandarin and linked English record has its own `sentenceMetadata` object:

| Field | Contract |
| --- | --- |
| `schemaVersion` | `1`. |
| `binding` | Exact source sentence ID, language (`cmn` or `eng`) and SHA-256 of its unchanged UTF-8 text. Later review results must match this binding. |
| `source` | `kind: tatoeba`, source label/URL, named contributor and text licence. This is the attribution behind the information marker. |
| `review.status` | `source_marked`, `concerns` or `unrecorded`. Positive source marks are not an independent certification. |
| `review.concerns[]` | Stable `code`, affected `scope` (`sentence`, `translation`, `pinyin` or `audio`), readable `message`, plus exact `sourceTag` when applicable. |
| `review.okTag`, `positiveRatings`, `negativeRatings`, `unsureRatings` | Separate evidence fields; never collapsed into a quality percentage. Full identities/dates remain in the containing record's reviews/taggings. |
| `review.secondaryReview`, `aiReviewed` | Currently `not_started` / `false`; pending review alone is not a warning. |
| `translationVerified`, `pinyinVerified`, `targetCharacterSenseVerified` | Currently false, independently scoped; sentence approval never approves these other fields. Named transcription reviewers remain on each transcription. |
| `display.marker` | `source_info` for ordinary source/pending metadata; `warning_triangle` when recorded concerns exist. |
| `display.label` | Accessible label for the corresponding marker. A triangle must expose its concern text, not rely on colour alone. |

The frontend should render these recorded marker fields with the app's existing
source-information/warning popover pattern. No UI publication or sentence import
is performed by this preparation step. Chinese and English can have different
markers; do not inherit approval across a translation link or audio attachment.

The minimal [external translation review TSV](../../../../reports/tatoeba-translation-review.tsv)
contains one representative candidate per uncovered exact character and only
four columns. Its stable IDs retain both source sentence IDs and the character
code point, linking feedback back to this evidence without extra TSV columns.
