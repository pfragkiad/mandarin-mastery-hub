# Shared Levels 7–9 sentence draft review

Reviewed 2026-11-28. This report covers the three owner-requested sentence draft
ranges for all **5,600 official shared Levels 7–9 entries, IDs 5401–11000**. The
Level 7 filename is a working name for the combined advanced band, not a claim
that these are 5,600 separately assigned Level 7 words.

The final Chinese/English draft snapshot passes complete coverage, exact identity and target,
field, language, and exact-duplicate checks. Targeted editorial review corrected
the concrete issues recorded below. The sentences remain assisted editorial
drafts: this is not independent native-speaker review, corpus attestation, or
certification that every sentence is free of semantic or stylistic weaknesses.

## Inputs and scope

- Official identity/reading/POS seed:
  [hsk3_level7_0.0.1.json](../importer/hsk/hsk3_level7_0.0.1.json).
- Draft inputs and format:
  [sentence-drafts/README.md](../importer/data/hsk-level7/sentence-drafts/README.md).
- Official extraction evidence:
  [official source audit](hsk-level7-0.0.1-official-source-audit.md), including
  [the Chinese Testing International syllabus PDF](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf).
- Reading/sense support: the repository's preserved
  [CC-CEDICT archive](../importer/data/character-readings/cedict_1_0_ts_utf-8_mdbg.txt.gz),
  whose publisher describes the project at
  [MDBG CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict).
  Dictionary readings help select a sense; they do not silently replace official
  identity, reading, or POS fields.
- Shared pinyin work is a separate artifact:
  [pinyin-0.0.1.json](../importer/data/hsk-level7/sentence-drafts/pinyin-0.0.1.json).
  Its source bindings and validation metadata must correspond to the final draft
  hashes below before assembly. A successful syllable alignment does not by
  itself validate contextual pronunciation or meaning.

The review reads the draft ranges and official metadata. The corrections below
are applied to the final draft files; official vocabulary fields, runtime
vocabulary, recordings and lesson files are outside this sentence review.

## Complete mechanical checks

| Check | Result |
| --- | --- |
| JSONL parsing and exact keys | 5,600 valid objects; exactly `id`, `headword`, `style`, `hanzi`, `english` |
| Ordered official coverage | Exactly IDs 5401–11000, once each, matching the seed order |
| Exact headword identity | Every headword equals its selected official entry |
| Target occurrence | Every sentence contains its complete official headword contiguously |
| Nonempty fields and style | All language fields nonempty; only `written` or `conversational` |
| Sentence/language hygiene | Chinese text ends with sentence punctuation; English fields contain no Han characters |
| Exact duplicate IDs | 0 |
| Exact duplicate Chinese sentences | 0 |
| Exact duplicate English sentences | 0 after the 8897 correction |
| Style counts | 3,489 written; 2,111 conversational |
| Chinese-character lengths | 10–22; 5,170 at least 12; 430 at 10–11; none above 32 |

Lengths count Han characters, excluding punctuation. The brief 10–11-character
examples remain concise complete clauses; the 12–32-character drafting target was an aim,
not a reason to pad every naturally short example.

A global near-duplicate screen removed punctuation, generated candidate pairs
from shared character trigrams, and compared candidates with Python
`difflib.SequenceMatcher` at a ratio of at least 0.82. It identified the
5401/7766 pair recorded below. This is a surface-similarity screen, not an
exhaustive measure of semantic repetition. An additional search found no target
followed by metalinguistic fillers such as `的意思`, `的含义`, `的读音`, `这个词`, or
`一词`; that narrow search does not establish genre balance or complete
naturalness.

## Reading and POS-sensitive review

All **15 repeated-headword groups / 30 rows** were checked as separate selected
entries, rather than merged by character string:

| Group | Distinction present in the examples |
| --- | --- |
| 5402/5404 挨 | āi: adjacent to a window; ái: receiving criticism |
| 6145/6146 大意 | dàyì: main idea; dàyi: careless |
| 6160/6174 担 | dān: bear risk; dàn: a shoulder load |
| 6568/6569 粉丝 | glass noodles; admirers |
| 6616/6621 缝 | féng: sew; fèng: a crack |
| 7172/7175 晃 | huǎng: dazzle; huàng: shake |
| 7668/7670 圈 | juān: pen animals; juàn: animal enclosure |
| 8119/8120 麻 | numbness; hemp |
| 8129/8130 码 | yards of fabric; stack bricks |
| 8174/8178 闷 | mēn: stuffy; mèn: bored |
| 8179/8182 蒙 | mēng: deceive; méng: cover the eyes |
| 8371/8376 拧 | níng: wring a towel; nǐng: twist open a cap |
| 8644/8659 呛 | qiāng: choke on water; qiàng: irritating cooking fumes |
| 10729/10730 制服 | uniform; subdue |
| 10913/10914 自负 | bear one's own expenses; conceited |

The review also inspected all **142 entries** whose exact headword has more than
one reading in the pinned CC-CEDICT file. This set includes neutral-tone,
regional, and orthographic variants as well as sense-changing heteronyms; its
size must not be presented as 142 source defects.

All **21 explicitly numbered official homograph rows** were checked. The table
above includes the paired cases. The additional numbered rows preserve their
selected contexts: 5890 成年 uses the year-round adverb; 6114 打 introduces a
starting time; 6299 调 is a musical key; 7030 和 describes mild weather; 8086 露 is
dew; 8252 命 means order; 8616 签 is a bamboo lot; 10523 则 counts a notice; 10674
之 is an object pronoun; 10844 转机 is a favorable turn; and 10992 作为 concerns
making a contribution. These examples do not borrow a different numbered
entry's sense simply because the headword matches.

## Corrections applied

| ID / target | Finding and accepted disposition |
| --- | --- |
| 5558 本分 | Improved the collocation to `尽好自己的本分，比空口承诺有用。` |
| 5775 残 | Replaced the awkward damaged-bridge construction with `这部古书已经残了几页，内容难以读全。`, retaining the source verb use. |
| 5790 舱 | Corrected the action sequence: enter the passenger cabin before stowing luggage. |
| 6367 独一无二 | Reconciled singular `这个杯子` with subsequent `每个`: `这些杯子都是手作的，每个都独一无二。` |
| 6724 告 | Replaced ambiguous `把丢车的事告了老师` with a clear complaint: `他向老师告了状，说有人藏起了他的书包。` |
| 7108 糊 | Replaced `破纸窗` with `破损的纸窗` in the repapering example. |
| 7766 恳求 | The original differed from 5401 哀求 by one word. Replaced it with `她恳求房东再宽限几天，好把东西收拾妥当。` / “She begged the landlord for a few more days to finish packing.” |
| 8897 沙滩 | The original shared its exact English translation with 5863 潮水. Replaced it with `孩子们在沙滩上用贝壳拼出了一条小鱼。` / “The children arranged shells into a little fish on the beach.” |
| 9760 误差 | Replaced the imprecise measurement-difference phrasing with a calibrated measurement and an explicit error: `仪器校准后，这次测量的误差不到一毫米。` / "After the instrument was calibrated, the error in this measurement was less than one millimeter." |
| 10984 琢磨 | The carving/polishing example required `zhuómó`, unlike the source's `zuó-` reading. Replaced it with the pondering context `这把锁怎么都打不开，他琢磨了半天才找到窍门。` / “The lock would not open; he pondered it for ages before finding the trick.” Official `zuómo` remains unchanged. |

The B owner additionally reviewed and corrected these reading/POS-sensitive
contexts before the final snapshot: 7292 脊梁 (figurative backbone), 7530 尽
(`jǐn`, prioritize seats), 7797 口音 (oral speech sounds rather than the
neutral-tone accent sense), 7990 两栖 (predicate use), 8020 临床 (explicit clinical
practice), 8702 倾倒 (`qīngdǎo`, trees toppling rather than `qīngdào`, dumping),
and 8881 散落 (`sànluò`, dynamic scattering rather than static `sǎnluò`). The
pinned dictionary supports these distinctions. The figurative editorial
rejection sense of 8645 枪毙 was retained; it is not a violent incident used as
filler.

## Source cautions retained

These notes concern printed source readings or grammatical classification. None
authorizes rewriting raw official tuples, and a dictionary disagreement alone
does not prove the official source wrong.

| ID / target | Caution |
| --- | --- |
| 5714 不见得 | The source prints `bújiàndé`; the normal modal use often has neutral final `de`. The pinyin layer exposes this difference rather than claiming the printed tuple was corrected. |
| 9382 疼爱 | Printed `téngài` needs syllable separation as `téng` + `ài`; a display apostrophe is a spelling/segmentation repair, not a different lexical reading. |
| 10984 琢磨 | Official `zuómo` is retained in the new pondering context. CC-CEDICT lists colloquial pondering as `zuo2 mo5` and carving/polishing as `zhuo2 mo2`. The former is a full-tone/neutral-tone comparison, not evidence that the official first syllable should be changed to `zhuó`. |
| 7309 继 | Printed POS is `连`; `继姐姐之后` is commonly analyzed as a prepositional construction. The temporal sense is explicit. |
| 7774 空前 | Printed POS is `动`; normal unprecedented usage is adjectival. |
| 7966 连年 | Printed POS is `动`; normal successive-years usage is temporal/adverbial. |
| 8356 年均 | Printed POS is `动`; normal usage expresses an annual average. |
| 8586 迄今 | Printed POS is `动`; normal usage means up to the present. |
| 9701 无比 | Printed POS is `动`; the sentence uses the common degree construction `无比幸福`. |
| 10373 由衷 | Printed POS is `动`; the sentence uses `由衷地` to express sincerity. |
| 10846 转眼 | Printed POS is `动`; the example uses the usual temporal meaning “in a blink.” The dictionary also records glancing, so this is a POS/context caution rather than an established source error. |

**Resolved regional-reading flag, 10112 压轴:** an earlier reviewer note wrongly
treated the Taiwan `yāzhóu` reading as grounds to reject official `yāzhòu`.
That note is retracted. The pinned CC-CEDICT entry explicitly records mainland
`ya1 zhou4` and Taiwan `ya1zhou2`; the
[Shandong Light Industry Vocational College teaching page](https://jiaowu.sdlivc.edu.cn/info/1033/5281.htm)
also gives mainland `zhòu`. The
[Taiwan Ministry of Education dictionary](https://dict.revised.moe.edu.tw/dictView.jsp?ID=151986&la=1&powerMode=0)
supports the regional `zhóu` reading, not a universal override. The final draft
keeps official `yāzhòu` and explicitly places the act second from last.

The
[Taiwan Ministry of Education 琢磨 entry](https://dict.revised.moe.edu.tw/dictView.jsp?ID=118935&la=0&powerMode=0)
also gives regional `zhuómó` for multiple senses. The local pinned CC-CEDICT
distinction is the relevant additional evidence for selecting the mainland
pondering context; the Taiwan entry alone does not invalidate `zuó-`.

## Final draft bindings and remaining work

| Draft | Rows | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| [5401–7267](../importer/data/hsk-level7/sentence-drafts/5401-7267.jsonl) | 1,867 | 349,489 | `3e95913a7648bde4f4d5f6d6ad775d3e7390cf8832e703a855061bf7f780aee5` |
| [7268–9134](../importer/data/hsk-level7/sentence-drafts/7268-9134.jsonl) | 1,867 | 329,699 | `c7cc0ca4f0f2e681268e063e7284c45f287276866515462f935d2dab749e8b49` |
| [9135–11000](../importer/data/hsk-level7/sentence-drafts/9135-11000.jsonl) | 1,866 | 380,722 | `e76f46e3b0d780a43aa122474181ca0a4026f4d04254f1d22f4df6402b5124eb` |

The word-list seed used at the start of review had SHA-256
`e5cfacd062714f67a25cce10c261e00b47d3f5759ca9760667be39a2ee687e40`.
The preserved compressed CC-CEDICT archive SHA-256 is
`dbb9d79208dec5149c73834c10ec7cb21cf3cd96d7f8b2a7b53d701a3bdcece8`.

Final assembly is complete. The frozen assisted-pinyin overlay is
4,585,767 bytes, SHA-256 `6993947fd8e8bf0fbca1591b171a42f8161061a5efb5d4367f03428a47691b47`,
and binds all three final draft hashes. Fresh generation and a separate
reproduction check pass all **5,600 shared phrase alignments and 5,600 exact
syllable round-trips**, with zero failures. An independent final handoff check
also validates all official tuples, target spans, styles and unique Chinese and
English fields. See the [machine validation](hsk-level7-0.0.1-sentence-validation.json).

The final handoff is **4,383,316 bytes** (one entry per line), SHA-256
`10d1074d3630ce7b43be21f63e8cee7577ed27a9b896fd1c364b21ebbd47a9a3`. It needs no split. The 2,111 conversational and 3,489 written
examples each include Chinese, pinyin and English. English word meanings,
classifications and application entry kinds remain pending, so runtime import
is explicitly disabled.

The pinyin review checked all 288 target/supporting-tool differences without
finding another target-sense mismatch. It also corrected concrete surrounding-word
cases: classifier/planting 种, duration 长, predicate 为, measured 只,
一行 geese, 曲子弹 rather than a cross-word 子弹, and resultative
睡不着/找不着. Exact contextual overrides and protected word spans
remain checksum-bound in the drafting tool rather than changing dictionary data.

**1,020 sentences retain explicit reading-review flags.** These include exposed
single-character/compound polyphony and the source cautions above; flags are
review prompts, not a count of proven errors. One non-target 转动 sense remains
marked ambiguous. Directional 来/去 complements retain dictionary tones unless
explicitly reviewed; colloquial neutral variants may differ. Pypinyin/jieba
boundaries and structural alignment do not establish contextual speech or
independent native review. All examples remain editorial drafts.

The complete mechanical screen covers every entry. Additional editorial
judgment was targeted at the risk sets and concrete findings above; it is
not an exhaustive independent native-language or external factual review of
all 5,600 pairs. In particular, unchanged English translations remain draft
translations, and topical variety or low string similarity does not establish
that each sentence is the best teaching example for its word.
