# HSK Level 6 Round Two Replacement Validation

**28 November 2026. Draft for owner validation.** This checks the four follow-up notes and 44 new candidates in [the next-round review](hsk-level6-0.1.0-suggested-replacements-review.md), alongside the [original 25 proposals](hsk-level6-0.1.0-suggested-replacements.md).

The main required correction is **4282 结果, written**: its proposed generalization about fruit trees flowering and bearing fruit in autumn should be replaced. **3964 凡是** benefits from clearer wording, and **4109 国产** needs a consistent treatment of experiential 过 in pinyin. Two further wording changes below are optional.

The source JSON and both reviewed reports remain unchanged. All candidates and alternatives remain pending owner validation; structural alignment is not linguistic approval.

## Checked inputs and structural results

| Input | SHA-256 |
| --- | --- |
| [Vocabulary JSON](../importer/hsk/hsk3_level6_0.1.0.json) | `359d066fbc59138dcc88cdb00cb054bb8c85a64cfb99d2ba7bb912bd8b6cbc47` |
| [Original 25 proposals](hsk-level6-0.1.0-suggested-replacements.md) | `2d79ece8e19b8bdeb87c2ff8da5bf5631d47ddfbf5fc4783e65256fa079eccbe` |
| [Next-round review](hsk-level6-0.1.0-suggested-replacements-review.md) | `487ecdb797ee1bf6eca94b1fb297017bd1715199ba4c25df1b4b3cb46fcc275e` |

All 44 new candidates match their source entry and example slot, quote the current Chinese correctly, contain the target headword, match their stated character counts, meet the review's proposed length ceilings and pass `alignPhrasePinyin`. They add no duplicate sentence texts against the vocabulary JSON, one another or the first 25 proposals. Together, the two sets contain **69 distinct example slots across 66 entries**.

The claim that none of the 44 replaces a baseline `pass_candidate` is incorrect. The actual baseline statuses are **42 `replace_required`, 1 `trim_or_rewrite`, and 1 `pass_candidate`**. The exception is **5042 象棋, conversational**. Its replacement is justified: the existing sentence asks about 国际象棋 rather than Chinese chess. Correct the scope statement rather than discarding this useful correction.

## Follow-up on the four earlier proposals

| Entry | Assessment of the next-round note | Suggested handling |
| --- | --- | --- |
| 3775 充实, conversational | The seven existing 不少 examples all write `bùshǎo`. | Keep the proposed Chinese and English; change `bù shǎo` to `bùshǎo` for consistency. Complete text below. |
| 3680 不曾, conversational | The proposed `qùguo` should not be changed merely to copy the source's mechanical `qù guò`. Word attachment and tone marking are separate questions. | Keep `Nǐ shuō de dìfang, wǒ bùcéng qùguo.` pending the same pronunciation convention used for experiential 过 elsewhere. No Chinese replacement is needed. |
| 3660 兵, written | Both the existing standalone 兵 proposal and the new 新兵 alternative are valid contexts. A historical narrative is still written prose. | The modern alternative is an optional preference, not a mandatory correction. Complete text below. |
| 3678 布, written | Both 箱中 and 箱子里 work. 箱子里 gives a more everyday tone. | The expanded version is optional wording polish. Complete text below. |

### 3775 充实 pinyin spacing

**Chinese:** 最近实习很充实，学了不少东西。

**Pinyin:** Zuìjìn shíxí hěn chōngshí, xué le bùshǎo dōngxi.

**English:** My internship has been fulfilling lately; I've learned a lot.

**Change:** Pinyin spacing only. **Owner decision:** Pending.

### 3660 兵 optional modern context

**Chinese:** 一批新兵已完成基础训练。

**Pinyin:** Yì pī xīnbīng yǐ wánchéng jīchǔ xùnliàn.

**English:** A group of new recruits has completed basic training.

**Change:** Optional replacement for the earlier historical setting. **Owner decision:** Pending.

### 3678 布 optional wording

**Chinese:** 她从箱子里取出一块白布。

**Pinyin:** Tā cóng xiāngzi lǐ qǔchū yí kuài bái bù.

**English:** She took a piece of white cloth from the box.

**Change:** 箱中 becomes 箱子里. **Owner decision:** Pending.

## New candidates needing revision or an explicit choice

### 4282 结果 written requires a factual correction

**Reviewed candidate:** 果树一般在秋季开花结果。

This treats autumn flowering and fruiting as a general rule for fruit trees. That is inaccurate. Apples provide a straightforward counterexample: Minnesota Extension describes spring flower development, summer fruit thinning and late-summer/autumn harvesting. The sentence should teach `jiēguǒ` without imposing an incorrect seasonal rule. [University of Minnesota Extension, Growing apples in the home garden](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-apples).

**Suggested Chinese:** 这棵果树去年开始结果。

**Suggested pinyin:** Zhè kē guǒshù qùnián kāishǐ jiēguǒ.

**Suggested English:** This fruit tree began bearing fruit last year.

**Characters including punctuation:** 11. **Owner decision:** Pending.

The conversational candidate 桃树今年结果了吗？ can remain; its target is also the verb `jiēguǒ`.

### 3964 凡是 conversational benefits from a clearer referent

**Reviewed candidate:** 凡是能帮上忙的，我一定去。

The omitted referent after 的 leaves the relationship to 我一定去 implicit. Naming the places where help is needed makes the sentence and English easier to match. This is a clarity recommendation, not a claim that conversational ellipsis is always ungrammatical.

**Suggested Chinese:** 凡是需要帮忙的地方，我都去。

**Suggested pinyin:** Fánshì xūyào bāngmáng de dìfang, wǒ dōu qù.

**Suggested English:** I'll go wherever help is needed.

**Characters including punctuation:** 14. **Owner decision:** Pending.

### 4109 国产 conversational needs consistent aspect-marker pinyin

**Reviewed candidate:** 你用过这款国产手机吗？

**Reviewed pinyin:** Nǐ yòng guò zhè kuǎn guóchǎn shǒujī ma?

Keep the Chinese. If the candidate set retains its proposed neutral-tone experiential 过, as in `qùguo` at 3680, use the same treatment here:

**Suggested pinyin:** Nǐ yòngguo zhè kuǎn guóchǎn shǒujī ma?

**English:** Have you used this domestically made phone?

GB/T 16159-2012 §6.1.2.1 supports joining a verb to its following aspect marker. That spacing rule should not be conflated with the separate decision about tone marking in learner transcriptions. Do not establish the pronunciation policy by copying the unreviewed source pinyin. [Ministry of Education copy of GB/T 16159-2012](https://www.moe.gov.cn/ewebeditor/uploadfile/2015/01/13/20150113091717604.pdf).

**Characters including punctuation:** 11. **Owner decision:** Pending, including the pinyin convention.

### 4755 舌头 conversational has an optional smoother warning

**Reviewed candidate:** 吃太烫的面条小心烫到舌头。

The meaning is understandable. Adding 时 and a pause makes the warning easier to read and avoids repeating 太烫 and 烫到 in one short line.

**Suggested Chinese:** 吃面条时，小心烫到舌头。

**Suggested pinyin:** Chī miàntiáo shí, xiǎoxīn tàngdào shétou.

**Suggested English:** Be careful not to burn your tongue when eating noodles.

**Characters including punctuation:** 12. **Owner decision:** Pending; optional polish.

### 5045 消除 written has an optional clearer cause

**Reviewed candidate:** 仔细检查消除了潜在的安全隐患。

Inspection can lead to hazards being removed, but the sentence leaves that remedial action implicit. Naming an action that removes the hazard gives 消除 a more concrete example.

**Suggested Chinese:** 清理杂物消除了通道的隐患。

**Suggested pinyin:** Qīnglǐ záwù xiāochú le tōngdào de yǐnhuàn.

**Suggested English:** Clearing the clutter eliminated hazards in the passageway.

**Characters including punctuation:** 13. **Owner decision:** Pending; optional clarification.

## Other new candidates

No further wording change is proposed for the following **39 new candidates** in this pass. Their full Chinese, pinyin and English remain in the [next-round review](hsk-level6-0.1.0-suggested-replacements-review.md). This disposition does not replace owner or native-speaker validation, and does not certify a strict HSK vocabulary boundary.

| Entry | Example slot |
| --- | --- |
| 4282 结果 | conversational |
| 4588 片面 | written |
| 4260 间隔 | conversational |
| 4260 间隔 | written |
| 4382 科普 | conversational |
| 4688 热点 | conversational |
| 4771 声调 | written |
| 5244 再生 | conversational |
| 3924 都市 | written |
| 4114 过渡 | conversational |
| 4125 罕见 | written |
| 4273 焦虑 | written |
| 4454 流程 | written |
| 4528 名胜 | conversational |
| 4596 品尝 | conversational |
| 4653 清晨 | conversational |
| 4714 融化 | written |
| 4741 闪电 | conversational |
| 4778 师父 | conversational |
| 4818 输出 | conversational |
| 4830 衰老 | conversational |
| 4889 添加 | conversational |
| 4956 外甥 | written |
| 4985 温柔 | written |
| 5147 一道 | conversational |
| 5299 之所以 | conversational |
| 5360 专利 | conversational |
| 4002 符号 | written |
| 4766 神经 | conversational |
| 5208 与其 | conversational |
| 5364 转换 | conversational |
| 5384 自愿 | conversational |
| 4259 鉴定 | conversational |
| 4631 恰恰 | conversational |
| 4667 情形 | written |
| 4919 投票 | written |
| 5166 议论 | written |
| 5042 象棋 | conversational |
| 5042 象棋 | written |

The 21 earlier proposals that the next-round reviewer passed need no additional wording change from this check. The four earlier follow-up items are addressed above. Nothing in either candidate set has been applied to the vocabulary JSON.
