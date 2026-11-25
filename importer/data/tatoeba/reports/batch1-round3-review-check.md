# Batch 1 Round 3 review check

**Partial review; content remains under review.**

The new supplied file `batch1-final-report-part-01-round3-review.tsv` covers exactly Part 1: **94 of 375 rows** (78 distinct Chinese/English source pairs). All IDs, order, original text, prior findings and submitted suggestions match. No duplicate IDs or target-character loss were found. Repeated pairs receive consistent returned feedback.

**81 Pass, 12 Minor Review, 1 Needs Fix; 281 rows await Round 3.** These are character-specific row counts, not distinct sentence counts. The absence rule authorized for Reviewer 2 is not applied to this new round.

The reviewer proposes 1 additional Chinese edit and 10 additional English edits relative to the submitted suggestions. Original wording and both proposal versions stay separate. Even a Pass may include optional polish; it is not automatic approval of replacement text.

## Returned cases still flagged

- **州 - Needs_Fix** (`tatoeba:347820:330451`): Proposal fixes only the script mix (并→並) and misses a meaning error: ZH 并和我一起乘火車 says Biden rode the train with the speaker, but EN says he rode with the men and women he grew up with. Changed 我→他們. Very long sentence; consider whether it suits learner display.
- **宗 - Minor_Review** (`tatoeba:1097589:319877`): Oriental is dated and often considered offensive in modern English; Eastern is the neutral rendering of 東方.
- **托, 伦, 弗 - Minor_Review** (`tatoeba:2335946:1837490`): Accept space removal and EN now matching ZH. Open issue for owner: the question presupposes a divorce Columbus did not have, so it looks like a joke setup with no punchline; confirm source alignment and teaching suitability. Same sentence appears under 托, 伦, 弗 - keep all three consistent.
- **残 - Minor_Review** (`tatoeba:4844787:4834102`): Agree crippled is wrong for a face. Proposal changed tense (had→has) and Mama→Mom without support in the source; kept past tense and Mama. ZH 残缺 retained for target character, though 毁容 is more natural; owner to confirm intended condition.
- **韩 - Minor_Review** (`tatoeba:2620242:2628654`): EN word order (basically are) is awkward; 韩剧 is Korean dramas rather than soap operas. Content flag for owner: gender stereotype, consider suitability for learner material.
- **罢, 妨 - Minor_Review** (`tatoeba:819787:51884`): affected loses the negative sense of 妨碍 (hinder). Same sentence appears under 罢 and 妨.
- **胞, 瞧 - Minor_Review** (`tatoeba:2047862:314425`): Original EN states as fact what ZH presents as her belief (认为). Same sentence appears under 胞 and 瞧.
- **撒 - Minor_Review** (`tatoeba:2026506:37079`): Agree to drop a boy. Also add even to render 连...都 (proposal omitted it).
- **衰 - Minor_Review** (`tatoeba:3663355:3663353`): Accept spacing fix. EN impoverishes does not match 衰落 (decline); reworded. Optionally use ASCII % in ZH for consistency.

## Interpretation and remaining work

- The Biden sentence has a concrete pronoun/referent mismatch: the Chinese says "with me"; the English refers to the people he grew up with. The reviewer proposes changing the Chinese to "with them". This remains a draft correction, with the original preserved.
- Claims about Columbus history and English register are supplied reviewer observations, not independently verified historical or usage findings. The Columbus question remains flagged for context and suitability even after aligning its English.
- The reviewer prefers preserving "Mama had". Chinese here does not explicitly mark tense; neither English tense is certified by the isolated Chinese. Retain the uncertainty for the owner.
- 48 unreturned rows share source pairs with reviewed rows. Their exact IDs are listed in `batch1-review-chain.json` under `round3PendingSharedPairIds`. Keep wording consistent when reviewed; no Round 3 rating has been copied to those IDs.
- Earlier `effective_status` columns retain the Reviewer 1/2 result. `round3_status` records only this returned review; `latest_returned_status` selects the most recent available finding. Unreturned rows keep an explicit pending marker in the structured history.
- No sentence, translation, pinyin or recording has been imported into the application.

See [the consolidated review report](batch1-review-report.md), [four complete parts](batch1-review-report-parts/README.md) and [preserved input file](batch1-final-report-part-01-round3-review.tsv).
