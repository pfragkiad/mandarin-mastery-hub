# Batch 1 — consolidated report and proposed corrections

**Status: pending another review round. No final content has been chosen.**

This report covers the **375 exact-OK first candidates** (220 source
sentence pairs), the owner's “super OK” batch. The input file called
`tatoeba-quality-report.-batch1.tsv` actually reviews all 1,224 original
candidates; Reviewer 2 returns 82 rows across that larger set. Only
the 375-row OK subset is included in the output here.

| Effective supplied decision | Rows |
| --- | ---: |
| Pass | 308 |
| Minor Review | 39 |
| Needs Fix | 28 |

Reviewer 2 overrides the 39 returned rows in this subset.
The other 336 rows accept Reviewer 1's exact findings under
the owner's instruction, including unresolved flags. These are not independent
double-pass claims. Original scores, issue labels and notes remain preserved.

## Files for the next reviewer

- [Full report with originals, decisions and proposed corrections](batch1-final-report.tsv):
  all 375 rows, both review histories and separate suggested Chinese/English.
- [Four numbered parts](batch1-final-report-parts/README.md) and
  [complete ZIP download](batch1-final-report-complete.zip): use these when a
  viewer truncates the full TSV. Every column and record is retained.
- [Minimal proposed-content TSV](batch1-next-review.tsv): exactly `id`, `character`,
  `sentence`, `translation`, using the proposed wording for the next round.
- [Structured review-chain metadata](batch1-review-chain.json): exact original
  and proposed text hashes, provenance, scoped findings and source/warning markers.
- [Editable draft proposals](batch1-suggested-corrections.json): 31
  distinct flagged sentence pairs covering 67 rows. Proposals are assistant-authored
  drafts. No reviewer has approved these proposed edits yet.

The 308 Pass rows carry their source wording forward. Proposed Chinese edits
affect 32 rows and proposed English edits affect
35 rows; these counts overlap.
Every proposed sentence retains its exact target character. Original Tatoeba
Chinese/English and both supplied report files are unchanged.

## Corrections and decisions to check closely

- **Columbus (托、伦、弗):** the Chinese asks why he divorced; the English asks
  what he discovered. The proposed English follows the recorded divorce question.
  Confirm the intended topic and whether to keep the candidate at all.
- **Uyghur count (吾):** change two thousand to **twenty thousand** to match 两万.
  The source statement is not a current corpus-count assertion.
- **揉:** remove the unsupported English addition “and mending”.
- **國際歌 (徵、際、譯、爭、鬥):** repair the English and identify the song as
  *The Internationale*. [MOE song entry](https://dict.revised.moe.edu.tw/dictView.jsp?ID=72189&la=1&powerMode=0).
- **麽、蕃:** retain the target forms with a variant/register note. Replacing them
  with 麼/番 would erase the intended target. MOE records
  [麽 as a variant](https://dict.revised.moe.edu.tw/dictView.jsp?ID=26831&la=0&powerMode=0)
  and lists [蕃茄 in its vocabulary appendix](https://dict.concised.moe.edu.tw/appendix.jsp?AID=92016&ID=54&SN=%E3%84%88&la=0&powerMode=0&word=%E8%B2%A0%E6%88%90%E9%95%B7).
- **被單 (媽):** quilt cover is a provisional proposed sense. MOE records
  [several meanings](https://pedia.cloud.edu.tw/Entry/Detail/?search=%E8%A2%AB%E5%96%AE&title=%E8%A2%AB%E5%96%AE);
  confirm context rather than treating the reviewer label as definitive.
- **残、暧/昧、顆/記、專:** proposals still need context or phrasing decisions;
  the proposal notes state what remains uncertain. No missing referent was invented.
- Punctuation/spacing proposals are presentation edits; they do not establish a
  grammar error. The proposed middle dot in a personal name is optional.

## Next-round instructions

Review **both Chinese naturalness/grammar and English fidelity**. Keep IDs and
target characters unchanged. The minimal TSV contains draft editorial wording,
not a verbatim Tatoeba export. Return corrections/decisions keyed by ID and state
whether an issue affects Chinese, English or context. Repeated sentence pairs
should receive consistent wording while retaining every character-specific ID.
Pinyin, audio and intended dictionary reading/sense remain outside this review.
Nothing is imported into the app or marked finally approved.

Regenerate: `python scripts/reconcile-tatoeba-reviews.py --write`.
Verify: `python scripts/reconcile-tatoeba-reviews.py --check`.
