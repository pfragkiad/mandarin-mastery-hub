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
