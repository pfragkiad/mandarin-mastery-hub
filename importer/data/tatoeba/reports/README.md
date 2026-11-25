# Supplied reviews and the owner's Batch 1 final report

This is the report directory the owner created. At the owner's request the
consolidated outputs also live here, alongside their preserved input reports.
Nothing here is application data or final content approval.

| File | Purpose / consumer |
| --- | --- |
| `tatoeba-quality-report.-batch1.tsv` | Original first reviewer report, unchanged: all 1,224 first-candidate rows, despite its Batch 1 filename. |
| `tatoeba-quality-report-reviewer2-batch1.tsv` | Original consecutive second report, unchanged: 82 returned rows across the 1,224 candidates. |
| `.gitattributes` | Preserves supplied/generated TSV bytes across platforms and permits source CRLF line endings without normalization. |
| [batch1-final-report.md](batch1-final-report.md) | Human-readable final consolidation for the **375 exact-OK candidates**, with the next-round review instructions. This is a final report, not approved final wording. |
| [batch1-final-report.tsv](batch1-final-report.tsv) | Full 375-row report: original source text, both supplied review decisions/notes, effective decision and separate suggested Chinese/English. |
| [batch1-final-report-parts/](batch1-final-report-parts/README.md) | Four numbered TSVs containing 94, 94, 94 and 93 records, repeating all columns. Recombining the parts reproduces all 375 records in order. |
| [batch1-final-report-complete.zip](batch1-final-report-complete.zip) | Deterministic complete download: original full TSV, all four parts and their index. No decisions or corrections are omitted. |
| [batch1-next-review.tsv](batch1-next-review.tsv) | Minimal next-round input: `id`, `character`, `sentence`, `translation`; wording is explicitly proposed editorial content. All exact targets and stable row IDs are retained. |
| `batch1-review-chain.json` | Structured history, owner-specified inheritance rule, original-input SHA-256 hashes, original/proposed text bindings and source/warning marker metadata. |
| `batch1-suggested-corrections.json` | Editable assistant-authored proposals for 31 flagged pairs, including changes, context questions and supporting dictionary URLs. Pending another review round. |

The rule is explicit: Reviewer 2's returned row overrides Reviewer 1; an absent
row accepts Reviewer 1's findings, including `Minor_Review` / `Needs_Fix`. Only 39
returned rows belong to this 375-row OK subset; 336 inherit Reviewer 1. Outcomes
are 308 Pass, 39 Minor Review and 28 Needs Fix. These supplied outcomes never
approve newly suggested wording or certify pinyin/audio/character senses.

Generate with `python scripts/reconcile-tatoeba-reviews.py --write`; verify with
`--check`. Run `python scripts/reconcile-tatoeba-reviews.test.py` for exact-text,
identity, inheritance and target-preservation boundaries. Source files stay
unchanged; future review rounds should use new filenames and explicit bindings.
Parent context: [Tatoeba preparation](../README.md).
