# HISTORICAL AUDIT — SUPERSEDED FOR FIVE SOURCE EXPRESSIONS

This v1.1.4 report documents a prior release. The five naturalness rewordings are **reversed in v1.1.5**, which restores the original source phrases and adds optional visual usage notes. Do not use the five changed-expression rows as the current canonical text.

---

# Conversational Mandarin — verified linguistic and expression-export review v1.1.4

## Evidence and scope

- Baseline: previous coverage v1.1.3 package (17 conversational lessons + 2 independent character lessons).
- Core compatibility v3.3.2, taxonomy v2.0.0, embedded general-lesson schema v3.2.0 (unchanged).
- The user-supplied review findings were cross-checked against all lesson JSON grammar blocks and the packaged expression index.
- No new lessons, dialogues, questions, checkpoints, or curriculum placements were added.

## Audit results

| Issue | Verified baseline | Corrective action |
|---|---:|---|
| Grammar-example English is not a translation | 38 / 43 (review reported 37) | Use the canonical `example.english` translation; preserve the teaching explanation in its original note field |
| Model-answer placeholder gloss | 28 | Replace each `[model answer excerpt]` with a sentence-specific English gloss |
| Hanzi/pinyin terminal punctuation drift | 33 | Align display punctuation in the expression export; lesson sentence punctuation remains intact |
| Naturalness/usage targets | 5 | Edit only the five flagged review expressions; preserve their CMX IDs and lesson references |
| Non-neutral 不 in A-not-A 可不可以 | Confirmed | Standardize to neutral-tone `bu` for this teaching material |
| Inconsistent 有没有 segmentation | Confirmed | Use `yǒu méiyǒu` consistently as this course’s editorial spelling choice |
| Currency noun capitalization | Confirmed | Normalize `měijīn` as a common noun within utterances |
| Mixed apostrophe typography | Confirmed | Use ASCII `'` for Pinyin syllable boundaries (e.g., `Cháng'ān`, `shí'èr`) |
| British English `practise` | Confirmed | Normalize learner-facing copy to American-English `practice` |

## Changed expressions (stable permanent IDs)

| CMX ID | Old Hanzi | Revised Hanzi | Revised pinyin | Meaning |
|---|---|---|---|---|
| `CMX-121F2BDD3E59` | 我要现在吃午饭 | 我现在要吃午饭 | wǒ xiànzài yào chī wǔfàn | I am going to have lunch now. |
| `CMX-254A75AEDE95` | 我想现在吃午饭 | 我现在想吃午饭 | wǒ xiànzài xiǎng chī wǔfàn | I would like to have lunch now. |
| `CMX-B8F4416EDA77` | 我不想跟你一起喝 | 我今天不太想跟你一起喝茶 | wǒ jīntiān bú tài xiǎng gēn nǐ yìqǐ hē chá | I do not really feel like having tea with you today. |
| `CMX-C9042CF1784B` | 你不想跟我一起喝 | 你今天不太想跟我一起喝茶 | nǐ jīntiān bú tài xiǎng gēn wǒ yìqǐ hē chá | You do not really feel like having tea with me today. |
| `CMX-143FCD826472` | 过一会儿不好 | 过一会儿不方便 | guò yíhuìr bù fāngbiàn | A little later would not be convenient. |

## Identity policy and source traceability

- All 441 existing CMX IDs remain unchanged. Their IDs are now treated as immutable identifiers after assignment—not recomputed after approved copy edits.
- The one source phrase whose exact text was editorially improved remains referenced by its original source ID; its crosswalk status changes from `EXACT_ENTRY` to `FUNCTIONAL_VARIANT` with an explicit explanation.
- Original 17 lesson IDs, block/example IDs, choice IDs, question IDs, all progress checkpoint IDs/targets/optional flags and curriculum placements remain stable.
- 49 existing northern-style rhotic expression markers and two independent character lesson ZIPs are preserved.
- Source transcript coverage remains a curated functional crosswalk, not independently verified original audio.

## Linguistic sources

- Shanghai Second Polytechnic University Mandarin phonology: A-not-A 不 is typically neutral: https://thyy.sthu.edu.cn/27/74/c945a10100/page.htm
- GB/T 16159-2012 Pinyin orthography (word-based spelling, capitalization, syllable separators): https://pinyin.info/rules/GBT16159-2012.html
- Mandarin Chinese orthography of 没有: https://pinyin.info/readings/yin_binyong/o05_verbs.pdf

## Validation

- All 17 JSON lessons validated using general_lesson.schema.json and corresponding catalog-character IDs.
- All 19 nested lesson ZIPs and the outer ZIP passed integrity checks.
- Derived HTML and Markdown rebuilt directly from the patched canonical JSON.
- 0 remaining expression index English placeholders; 0 terminal punctuation mismatches; 0 duplicate normalized Hanzi index keys.
- Original 43 grammar formulas and 49 northern rhotic presentation markers retained.
- Core Project Sources v3.3.2 itself was not edited.
