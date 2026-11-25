# Tatoeba positive Mandarin inventory

Source: [official Tatoeba exports](https://tatoeba.org/en/downloads), language
**cmn**. Export file dates in this snapshot: 21 November 2026.
Exact URLs, timestamps and SHA-256 hashes are in the
[source manifest](../importer/data/tatoeba/manifest.json).

| Inventory | Sentences |
| --- | ---: |
| Current Mandarin source records | 89,325 |
| Exact OK tag | 862 |
| At least one +1 user rating | 5,518 |
| Both | 129 |
| Distinct positively marked | 6,251 |
| Held after exclusions | 354 |
| Eligible positive candidates | 5,897 |
| Eligible exact-OK candidates | 809 |
| Eligible with an unflagged direct English translation | 5,167 |

Start with [ok-candidates.tsv](../importer/data/tatoeba/selected/ok-candidates.tsv).
The broader working set is
[positive-candidates.tsv](../importer/data/tatoeba/selected/positive-candidates.tsv).
[All OK-tagged records](../importer/data/tatoeba/selected/ok-tagged.tsv) retain
their holds. Full evidence is in the bounded JSONL parts described in the
[review directory](../importer/data/tatoeba/selected/README.md).

Only positive source marks enter this inventory. Negative ratings, archaic,
native-check/correction/attention tags and entirely stale positive evidence are
held. Hold reasons can overlap. One OK tag points to an ID absent from the
current Mandarin text export and is recorded separately, not admitted.
Contributor Mandarin levels are self-reported and never a trust certificate.

No secondary AI or native-speaker review has run. Mandarin OK does not certify
its translation, pinyin, audio, teaching suitability or a target character sense.
Exact text occurrence offers potential coverage for
**1,224 additional character records**
with direct English; this is not an approved character/example assignment.

## Audio claim check

The [official audio page](https://tatoeba.org/en/audio/index/cmn) and downloaded
metadata show **5,826 recordings**, not 1,747.
This snapshot has one recording per ID; one audio ID is absent from the current
text export, leaving 5,825
joinable sentences. All of those have exported pinyin and an alternative Hans or
Hant conversion. Only 1,754 have
a named pinyin reviewer. Script conversions are not independently proofread
parallel originals.

Audio licence metadata: **5,742 with (not supplied); 84 with CC BY-NC 4.0**. Tatoeba's export documentation
says an empty audio licence does not permit reuse outside Tatoeba.
Of our positive working candidates,
547 have audio metadata and only
6 recordings have
an explicit licence. Candidate audio licences: 541 with (not supplied); 6 with CC BY-NC 4.0.
Licence conditions, including any noncommercial restriction, remain attached.
No audio binaries were downloaded.

Nothing was imported into the app. Reproduce/check with
`python scripts/prepare-tatoeba.py --filter --check`; boundary and snapshot tests:
`python scripts/prepare-tatoeba.test.py`.
