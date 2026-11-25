# Supplied reviews and Batch 1 review reports

This is the report directory the owner created. At the owner's request the
consolidated outputs also live here, alongside their preserved input reports.
Nothing here is application data or final content approval.

| File | Purpose / consumer |
| --- | --- |
| `tatoeba-quality-report.-batch1.tsv` | Original first reviewer report, unchanged: all 1,224 first-candidate rows, despite its Batch 1 filename. |
| `tatoeba-quality-report-reviewer2-batch1.tsv` | Original consecutive second report, unchanged: 82 returned rows across the 1,224 candidates. |
| `.gitattributes` | Preserves supplied/generated TSV bytes across platforms and permits source CRLF line endings without normalization. |
| `batch1-final-report-part-01-round3-review.tsv` | Preserved new reviewer input: all 94 rows of Part 1, with Round 3 decisions, notes and proposed wording. Its supplied filename remains unchanged. |
| [batch1-review-report.md](batch1-review-report.md) | Consolidated review for the **375 exact-OK candidates**. Round 3 is partial and owner content decisions remain pending. |
| [batch1-review-report.tsv](batch1-review-report.tsv) | Full 375-row report: original source, Reviewer 1/2 history and suggestions, separate Round 3 decisions/notes/suggestions and latest returned status. |
| [batch1-round3-review-check.md](batch1-round3-review-check.md) | Round 3 integrity check, counts, unresolved findings and interpretation cautions. |
| [batch1-review-report-parts/](batch1-review-report-parts/README.md) | Four numbered TSVs containing 94, 94, 94 and 93 records, repeating all columns. Recombining the parts reproduces all 375 records in order. |
| [batch1-review-report-complete.zip](batch1-review-report-complete.zip) | Deterministic complete download: original full TSV, all four parts and their index. No decisions or corrections are omitted. |
| [batch1-next-review.tsv](batch1-next-review.tsv) | Preserved minimal Round 3 submission: `id`, `character`, `sentence`, `translation`. Contains the pre-Round-3 proposals; new reviewer suggestions are separate in the comparison report. |
| `batch1-review-chain.json` | Structured history, owner-specified inheritance rule, original-input SHA-256 hashes, original/proposed text bindings and source/warning marker metadata. |
| `batch1-suggested-corrections.json` | Editable assistant-authored proposals for 31 flagged pairs, including changes, context questions and supporting dictionary URLs. Pending another review round. |

The rule is explicit: Reviewer 2's returned row overrides Reviewer 1; an absent
row accepts Reviewer 1's findings, including `Minor_Review` / `Needs_Fix`. Only 39
returned rows belong to this 375-row OK subset; 336 inherit Reviewer 1. Outcomes
are 308 Pass, 39 Minor Review and 28 Needs Fix. These supplied outcomes never
approve newly suggested wording or certify pinyin/audio/character senses.

Round 3 returns **94 rows: 81 Pass, 12 Minor Review, 1 Needs Fix**. The other
**281 remain pending Round 3**. The Reviewer 2 absence rule does not apply to
Round 3. `effective_status` retains the earlier Reviewer 1/2 decision;
`round3_status` records only returned Round 3 feedback, and
`latest_returned_status` is the most recent available finding. Reviewer-proposed
wording remains separate and is not owner approval. Generated artifacts use
“review report”; the supplied Round 3 filename is preserved verbatim.

Generate with `python scripts/reconcile-tatoeba-reviews.py --write`; verify with
`--check`. Run `python scripts/reconcile-tatoeba-reviews.test.py` for exact-text,
identity, inheritance and target-preservation boundaries. Source files stay
unchanged; future review rounds should use new filenames and explicit bindings.
Parent context: [Tatoeba preparation](../README.md).
