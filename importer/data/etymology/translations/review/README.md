# Supplied partial editorial review

This directory preserves the user-provided 2026-11-22 review as an importer input.
It is a **partial editorial review**, not certification of all 9,833 translations.
The original Chinese source archive and source batches remain unchanged.

| File | Purpose, producer and consumer |
| --- | --- |
| [handoff.zip](handoff.zip) | Exact-byte copy of the supplied `reports/shuowen-review-handoff.zip`, saved by `scripts/import-shuowen-review.py --write`. Read by that importer and the etymology generator for provenance and consistency checks. Never extract or execute its contents. |
| [manifest.json](manifest.json) | Generated root metadata, partial-review scope, original ZIP/member hashes, corrected-export hash and checked change counts. |
| [review.schema.json](review.schema.json) | JSON Schema 2020-12 for the review manifest. |
| [uncertain-followup.zip](uncertain-followup.zip) | Exact-byte copy of the supplied still-uncertain-only report; 884 entries, all still flagged uncertain. |
| [uncertain-followup.json](uncertain-followup.json) | Follow-up ZIP/member hashes, primary-review binding, six edited keys and the 15 omitted uncertainty IDs. |
| [uncertain-followup.schema.json](uncertain-followup.schema.json) | JSON Schema for the subset follow-up manifest. |
| [uncertainty-reviewed-v2.txt](uncertainty-reviewed-v2.txt) | Exact-byte copy of the subsequently supplied full 9,833-entry working copy, including the 15 explicit resolutions missing from the subset. |
| [full-v2.json](full-v2.json) | Full-file hash, primary/subset bindings, 11 edited English keys and 15 explicitly resolved keys. |
| [full-v2.schema.json](full-v2.schema.json) | JSON Schema for the full v2 manifest. |
| [.gitattributes](.gitattributes) | Prevents checkout line-ending conversion of checksum-bound review ZIPs and the supplied full text. |
| [external-v3.zip](external-v3.zip) | Exact-byte copy of the supplied v3 archive: full master, remaining subset, 884-case register, 222-case evidence patch and narrative report. |
| [external-v3.json](external-v3.json) | Archive/member hashes, v2 baseline binding, checked/unchecked keys, edits, clearances and checked statistics. |
| [external-v3.schema.json](external-v3.schema.json) | JSON Schema for the v3 manifest. |

The archive's corrected working copy is authoritative for this import's English
and uncertainty flags. Its original export must match all imported Chinese IDs,
headwords and explanations. Its diff CSV and source-restoration CSV must agree
with both exports; checksum, duplicate-ID, missing-ID or baseline conflicts fail
before translation files are changed. Later manual English edits that diverge
from the recorded corrected copy also fail the runtime generation check.

From the repository root:

```sh
python scripts/import-shuowen-review.py reports/shuowen-review-handoff.zip --write
python scripts/import-shuowen-review.py --check
python scripts/import-etymology.py --write
python scripts/import-etymology.py --check
python scripts/shuowen-review.test.py
```

The subsequent subset is applied with:

```sh
python scripts/import-shuowen-review.py --uncertain-followup reports/shuowen-still-uncertain-only.zip --write
```

Once preserved, ordinary `--write`/`--check` replay both reviews in order. The
follow-up changes six English passages (53, 192, 592, 1028, 4326, 5076), introduces
no Chinese reading changes, and clears **no** uncertainty flags. Its 884 rows are
a subset of the 899 entries uncertain at that stage. The other 15 initially remained untouched;
absence from this extract is not evidence of resolution. Their exact IDs are in
`statistics.omitted_uncertain_keys` in the follow-up manifest. The later complete
v2 file supplies their explicit resolutions, as described below. The subset's
historical manifest correctly retains its original 899-before/899-after counts.

English batch references include both archive hashes. Runtime metadata records
each review's scope, with 1,949 distinct entries changed across the two handoffs.
The original primary manifest still reports its own 1,938 English edits/1,943
changed entries; the follow-up separately reports six additional English edits.
No counts are silently reinterpreted as fully verified translations.

Apply the subsequently supplied full file with:

```sh
python scripts/import-shuowen-review.py --full-v2 reports/shuowen-english-uncertainty-reviewed-v2.txt --write
```

This complete v2 file is checked against all 9,833 keys and effective Chinese
readings. Its still-uncertain IDs and English must agree exactly with the earlier
884-entry subset. It adds 11 English changes and explicitly clears 15 flags;
four of those resolutions leave the English wording unchanged. No Chinese
readings change. That stage left **884 uncertain entries**.
The full file is also a partial editorial review, not full certification.

Normal `--write`/`--check` replay primary review → subset → full v2. Batch
references and runtime input hashes bind the entire sequence. The primary and
subset manifests preserve their own historical counts; `full-v2.json` records
the authoritative later resolutions. Missing/tampered inputs, source changes
without apparatus, or disagreement with the subset fail before updates.

Apply the v3 archive with:

```sh
python scripts/import-shuowen-review.py --external-v3 reports/shuowen-884-external-verification-v3.zip --write
```

V3 is validated against all 884 v2 uncertainties, the complete 9,833-entry master,
the remaining subset, the case CSV, the evidence patch and the narrative count
table. It reports 222 individual cases checked, 109 cleared flags and 166 English
revisions. The current corpus has **775 uncertain entries**: 113 checked but still
unresolved (91 revised-retained, 22 checked-retained) and 662 not checked in this
pass. Unchecked cases cannot acquire revised English or cleared flags. All
Chinese strings remain unchanged. The importer preserves the reviewer claims;
it does not claim to have independently reopened the cited sources itself.

Runtime `editorialReview.caseEvidence` records the supplied decision, reason and
evidence URLs for all 222 checked cases, including unchanged ones. Its
`review-assessment` change kind distinguishes that review event from an actual
English/flag change. The learner's Advanced disclosure attributes the assessment
to the supplied reviewer; URLs stay metadata and review pinyin is not imported
as lexical pronunciation, speech or glyph identity. The partial-review status
remains in force, including after individual flags are cleared.

The import is repeatable: it accepts the original or already corrected drafts,
and changes only English text and uncertainty flags in the 99 English batches.
Each batch also records the review ID, partial status and exact ZIP hash; a missing
or mismatched review input then fails generation instead of losing the apparatus.
All 9,833 keys survive. There are 1,938 English edits and 16 cleared uncertainty
flags; that primary stage left 899 uncertain. A total of 1,943 entries differed
at that stage. Full v2 then left 884 uncertainties; v3 now leaves 775.

The 28 edited Chinese readings are **separate editorial apparatus** attached to
runtime `translation.editorialReview.sourceReading`. Each retains the proposed
headword/explanation, its own text hash, the supplied classification, rationale
and evidence URLs. Classifications such as `verified_alternative_witness` are
the review's labels, not a new claim of independent verification by this app.
Six emendations remain explicitly edition/quotation dependent. Seven proposed
headwords differ from the imported headword; their notes disclose this difference
and never remap catalogue identities or source associations. The export-cleanup
reading likewise leaves the actual original string intact.

The other archive members preserve the review instructions, original input,
operation logs, statistics and preliminary report for audit/rollback. Preliminary
suggestions are not separately applied on top of the corrected working copy.
Evidence URLs stay in metadata; no material from those external sites is fetched
or copied during ingestion. Review provenance is bundled locally, so generation
and application display require no hosted database or review API.
