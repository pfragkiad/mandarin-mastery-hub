# HSK Level 6 (`0.1.0`) Written & Conversational Sentence Review

- **Reviewed source:** [hsk3_level6_0.1.0.json](../importer/hsk/hsk3_level6_0.1.0.json) (`schema_version`: `hsk-example-pairs/1.3.0`, `data_version`: `0.1.0`)
- **Source SHA-256:** `359d066fbc59138dcc88cdb00cb054bb8c85a64cfb99d2ba7bb912bd8b6cbc47`
- **Scope:** All **1,800 entries** (IDs `3601–5400`) and **3,600 example sentences** (`1,800` `conversational` / `neutral_spoken` + `1,800` `written` / `plain_written`)
- **Item-level review sheet:** [hsk-level6-0.1.0-sentence-review.tsv](hsk-level6-0.1.0-sentence-review.tsv) (all 3,600 rows with `total_chars`, `han_chars`, `review_status`, `flags`, and `recommended_action`)

---

## 1. Executive Summary & HSK Readiness Verdict

**Verdict: Not yet ready for production HSK import as-is (`replace_required` or `trim_or_rewrite` affects 582 of 1,800 entries, plus systemic mechanical pinyin defects).**

While all 1,800 headwords and 3,600 sentences pass structural pinyin alignment (`alignPhrasePinyin`) and match the shared `hsk3_topics.json` (`2.0.0`) taxonomy, the three example provenance layers behave very differently for HSK learning:

| Provenance | Examples | Pass candidate | Trim / Rewrite | Fix pinyin / Format | Replace required |
| --- | ---: | ---: | ---: | ---: | ---: |
| `newly_authored` | 1,993 | 1,908 (95.7%) | 35 (1.8%) | 50 (2.5%) | 0 (0.0%) |
| `reused_editorial_example` | 188 | 146 (77.7%) | 4 (2.1%) | 5 (2.7%) | 33 (17.6%) |
| `selected_corpus_example` (Tatoeba) | 1,419 | 853 (60.1%) | 324 (22.8%) | 34 (2.4%) | 208 (14.7%) |
| **Total** | **3,600** | **2,907 (80.8%)** | **363 (10.1%)** | **89 (2.5%)** | **241 (6.7%)** |

By **style** across the 3,600 examples:
- `conversational` (`1,800`): `1,490` pass candidates (`82.8%`), `156` trim/rewrite (`8.7%`), `116` replace required (`6.4%`), `38` pinyin/format fixes (`2.1%`).
- `written` (`1,800`): `1,417` pass candidates (`78.7%`), `207` trim/rewrite (`11.5%`), `125` replace required (`6.9%`), `51` pinyin/format fixes (`2.8%`).

By **entry** (`1,800` headwords):
- **`1,218` entries (67.7%)** have both examples clear the automated length/format/duplicate/scanned-bug gates (`pass_candidate`, still requiring native-speaker & full polyphone sign-off).
- **`361` entries (20.1%)** need trimming, register alignment, or pinyin/punctuation cleanup (`needs_trim_or_pinyin_fix`).
- **`221` entries (12.3%)** have at least one `replace_required` blocker (`has_replace_required`).

The root causes are concentrated in four areas:
1. **`selected_corpus_example` (Tatoeba, 1,419 sentences):** Introduces oversized 21–38-character passages, multi-sentence dialogues, cross-boundary substring traps (`德国产`, `斯科普里`, `之间隔着`, `热点儿`, `再生病`, `声调小`), 164 duplicate occurrences across entries, spoken/written register inversions, translationese, typos/non-simplified characters, and political/sensitive trivia.
2. **Initial 100 `newly_authored` written examples (`3601–3700`):** Median length is `18` chars (`20/100` exceed `20` chars, up to `27` chars), heavily leaning on multi-clause report/policy templates (`调查显示…`, `报告指出…`), whereas the later `newly_authored` batch (`3701–5400`) is far crisper (`conversational` median `9`, `written` median `13`, only `1` over `20` chars).
3. **`reused_editorial_example` (188 sentences):** Includes `30` duplicate occurrences across HSK6 entries and a critical polyphone/sense mismatch on **`4282 结果` (`jiēguǒ`, "to bear fruit")**, which reuses HSK4 `jiéguǒ` ("result") sentences, plus **`4588 片面`** (`他吃了两片面包。`).
4. **Mechanical pinyin segmentation/polyphone defects:** Systemic errors across all three provenances (e.g., `中的` → `zhòngdì`, `了当` → `liǎodàng`, `到了` → `dàoliǎo`, classifier `只` → `zhǐ`, `长时间` → `zhǎng shíjiān`, `门将` → `ménjiàng`, `行业` → `xíng yè`, `中选择` → `zhòngxuǎn zé`, `和食品` → `héshí pǐn`, `他用` → `Tāyòng`).

---

## 2. Length & "Avoid Large Sentences" Audit

Comparing `hsk3_level6_0.1.0.json` against the pinned HSK 1–5 baselines shows where sentence bloat comes from:

| Dataset / Subset | Conversational (`med` / `p90` / `max`) | `>16` chars (Conv) | Written (`med` / `p90` / `max`) | `>20` chars (Writ) |
| --- | --- | ---: | --- | ---: |
| HSK 4 (`1.1.1`, `n=1000` each) | `7` / `8` / `14` | 0 | `11` / `13` / `24` | 1 (0.1%) |
| HSK 5 (`1.0.5`, `n=1600` each) | `8` / `11` / `26` | 13 (0.8%) | `15` / `17` / `25` | 16 (1.0%) |
| HSK 6 `newly_authored` (`3601–3700`, `n=100` each) | `10` / — / `15` | 0 (0.0%) | `18` / — / `27` | 20 (20.0%) |
| HSK 6 `newly_authored` (`3701–5400`, `n=763C / 1030W`) | `9` / — / `15` | 0 (0.0%) | `13` / — / `21` | 1 (0.1%) |
| HSK 6 `reused_editorial_example` (`n=18C / 170W`) | `9` / `15` / `19` | 1 (5.6%) | `15` / `18` / `22` | 3 (1.8%) |
| HSK 6 `selected_corpus_example` (`n=919C / 500W`) | `13` / `20` / `38` | **175 (19.0%)** | `18` / `26` / `37` | **166 (33.2%)** |
| **HSK 6 All (`n=1800` each)** | **`10` / `16` / `38`** | **176 (9.8%)** | **`14` / `21` / `37`** | **190 (10.6%)** |

Recommended HSK 6 usability targets (matching `newly_authored` 3701–5400 and HSK 5):
- **Conversational:** `6–15` total characters (`≤16` hard ceiling), single utterance, immediate everyday context.
- **Written:** `10–18` total characters (`≤20` hard ceiling), single crisp sentence or two short balanced clauses, no multi-sentence speeches.

### Worst-offender large sentences (examples to shorten or replace)

- **Conversational > 20 chars (`83` cases, all `selected_corpus_example`):**
  - `5182 引入` (`38` chars): `我们照例寒暄了一阵，闲扯扯队里的新闻以后，他在不知不觉中就把谈话引入了正题。` → Rewrite: `我们还是把话题引入正题吧。` (12 chars)
  - `3814 创立` (`35` chars): `道教是用老子的教导创立的，他是公元前六零四年在现代的河南省出生的圣贤。` → Rewrite: `这家老店是什么时候创立的？` (13 chars)
  - `3775 充实` (`34` chars): `粮仓充实了，百姓才会懂得礼仪规矩；衣食丰足了，人们才会知晓荣辱羞耻。` → Rewrite: `最近实习很充实，学了不少东西。` (15 chars)
  - `4264 将军` (`33` chars): `随着无继承人的国王的发疯和王室家族的中毒，将军终于有机会篡夺王位。` → Rewrite: `那部电影讲的是一位老将军的故事。` (16 chars)
  - `5296 支撑` (`33` chars): `政府官员表示，没有证据支撑中国学生可能是无意中传播病毒的人的观点。` → Rewrite: `这根柱子能支撑这么重的屋顶吗？` (15 chars)
  - `4457 流量` (`33` chars): `虽然视频平台没有明确禁止此类内容，但这种类型的作品的流量会被限制。` → Rewrite: `我这个月的手机流量快用完了。` (14 chars)
- **Written > 22 chars (`58` `selected_corpus_example` + `4` `newly_authored` from `3601–3700`):**
  - `4323 警告` (`34` chars, Tatoeba): `当迈克试图铲球的时候，他用手推了对方球员一把，结果得到了黄牌警告。` → Rewrite: `裁判向犯规球员出示了黄牌警告。` (15 chars)
  - `4151 洪水` (`28` chars, Tatoeba): `为了不被洪水冲走，有的人紧紧地抱着树干长达数个钟头。` → Rewrite: `连日暴雨引发了严重的洪水。` (13 chars)
  - `3671 不至于` (`27` chars, `newly_authored`): `虽然价格有所上涨，但还不至于影响大多数家庭的基本生活。` → Trim: `价格虽有上涨，但还不至于影响基本生活。` (19 chars)
  - `3691 不止` (`24` chars, `newly_authored`): `项目的意义不止于经济收益，还涉及社会和环境影响。` → Trim: `该项目的意义不止于经济收益。` (14 chars)
  - `3645 本能` (`23` chars, `newly_authored`): `面对突然的危险，人们往往会产生本能的防御反应。` → Trim: `面对危险时，人会产生本能反应。` (15 chars)
  - `3693 猜测` (`23` chars, `newly_authored`): `调查人员根据现场情况对事故原因作出了初步猜测。` → Trim: `调查人员对事故原因作出了初步猜测。` (17 chars)

---

## 3. Conversational vs. Written Register & Realism Review

### A. Register mismatches and length inversions
- **`124` entries have `conversational` >4 characters longer than `written`** (123 from `selected_corpus_example`, 1 from `reused_editorial_example`). Extreme case: **`4994 乌龟`** (`conversational` `21` chars `给我买只乌龟吧，妈妈，求你给我买只乌龟吧！` vs `written` `5` chars `乌龟死了。`).
- **`61` `written` examples are `< 10` characters**, mostly short fragments or casual lines from Tatoeba (e.g. `3748 撤回` `撤回前言。`; `4527 名气` `我没名气。`; `4722 弱点` `克服弱点。`; `4606 破产` `公司破产了。`; `4611 朴素` `他生活朴素。`; `4664 清醒` `我们很清醒。`; `4925 透明` `我的尿液是透明的。`; `5354 助手` `助手拿了钱。`).
- **Casual spoken sentences tagged `written`:**
  - `3703 彩虹`: `喏，快看快看！那有一道巨大的彩虹！`
  - `3944 恶心`: `有点恶心，但是吐不出来。`
  - `3863 耽误`: `我发现你玩绝对不耽误学习。我就不行。`
  - `4174 怀孕`: `不用，谢谢，我怀孕了。`
  - `4360 卡片`: `谢谢你寄给我的一张漂亮的卡片。`
  - `5035 香肠`: `我经常去重庆吃香肠` (missing period)
  - `5143 一辈子`: `要都解释的话，需要一辈子的时间。`
- **Formal signs, literary expressions, or news/policy prose tagged `conversational`:**
  - `3682 不得` (`newly_authored`): `未经允许，不得进入。` — This is a posted sign/written notice, not spoken conversation; conversational would be `没经过允许，不能进去。` or `这里不让进。`
  - `3669 不料` (`newly_authored`): `我以为会下雨，不料天晴了。` (`不料` is bookish in spoken Mandarin; `没想到` is spoken, so `不料` is better taught in a natural written narrative or clearly marked literary dialogue).
  - `3680 不曾` (`newly_authored`): `我不曾去过那里。` (`不曾` is literary/written; spoken Mandarin uses `从来没去过`).
  - `4013 该` (`newly_authored`): `该公司还在招聘吗？` (`该` "the aforementioned" is formal/written; spoken Mandarin uses `那家公司还在招人吗？`).
  - `3643 倍增` (`newly_authored`): `今年的订单数量倍增了。` (more written/business-report than casual speech; spoken Mandarin uses `翻了一倍`).
  - `4453 凌晨` (`selected_corpus_example`): `凶杀案于凌晨三到五点间发生。` (`于…间发生` is police/news writing, not conversation).
  - `5025 显著` (`selected_corpus_example`): `医学的最新进展颇为显著。` (`颇为` is formal written).
  - `4681 权力` (`selected_corpus_example`): `权力之争，非我即敌。` (literary aphorism).

### B. Realism & phrase usefulness (`newly_authored` spot-checks)
Most `newly_authored` sentences (`95.7%`) are clean, natural, and well-scoped—especially in `3701–5400` (`别踩到小猫。`, `这张照片是几寸的？`, `把海报卷起来吧。`, `你猜中了！`). Remaining polish targets in `newly_authored`:
- **`3601–3700` formulaic written openers:** Excessive reliance on institutional/report frames (`调查显示/发现`, `报告指出`, `研究团队`, `工作人员`, `该公司`), which makes sequential study feel repetitive rather than grounded in everyday written genres (signs, emails, short articles, stories, instructions).
- **Awkward or slightly unnatural phrasing in `newly_authored`:**
  - `3611 百货` (`conversational`): `这家商店卖百货吗？` — Unnatural; people say `百货商店` / `百货商场` / `日用百货` (e.g. `附近有百货商场吗？`).
  - `3625 保修` (`conversational`): `这台电脑还在保修吗？` — Usually `还在保修期内吗？` or `还能保修吗？`.
  - `3674 补偿` (`conversational`): `耽误了你的时间，我会补偿你的。` — Sounds slightly translated; more natural: `给你添麻烦了，回头我一定补偿。` or `这次损失我们会按规定补偿。`.
  - `3681 不成` (`conversational`): `这主意恐怕不成。` — Modern spoken Mandarin strongly prefers `不行` here; `不成` is more idiomatic in `办不成` / `谈不成` / `不成问题` / `难道…不成`.
  - `3660 兵` (`written`): `纪念馆展示了当年普通士兵的生活用品。` — Uses compound `士兵`; phrases like `派兵`, `新兵`, `老兵`, `兵力` highlight `兵` more directly (note `4358 军人` also covers soldiers).
  - `3678 布` (`written`): `制作传统服装时，工匠会根据用途选择不同的布。` — `选择不同的布` feels bare without `布料` or a classifier (`一块白布` / `棉布`).
  - `5369 转` (`zhuàn`, `written`): `风吹来，风车开始缓缓转动。` — `转动` is commonly read `zhuǎndòng`; using standalone `转` (`风车迎风不停地转。`) avoids ambiguity with `zhuǎn`.
  - `5393 足` (`written`): `充足的准备保证了活动顺利进行。` — Uses `充足` (an earlier-level word) rather than `足` itself (`人手不足`, `信心十足`, `准备得很足`).

---

## 4. Critical Sense, Reading & Substring-Match Blockers

Automatic corpus/editorial selection matched raw substrings without word-boundary or polyphone verification, producing **10 examples across 7 entries** where the sentence does **not** actually use the HSK6 headword:

| ID | Headword | Pinyin | Meaning | Style | Provenance | Current Sentence & Defect |
| ---: | --- | --- | --- | --- | --- | --- |
| `4282` | `结果` | `jiēguǒ` | to bear fruit | `conversational` | `reused_editorial_example` | `结果什么时候宣布？` — Uses HSK4 `jiéguǒ` ("result"), mis-read as `Jiēguǒ`. |
| `4282` | `结果` | `jiēguǒ` | to bear fruit | `written` | `reused_editorial_example` | `研究人员比较了人工分类和自动分类的结果。` — Same HSK4 `jiéguǒ` mismatch. |
| `4588` | `片面` | `piànmiàn` | unilateral; one-sided | `written` | `reused_editorial_example` | `他吃了两片面包。` — Cross-boundary `片 + 面包`, aligned as `piànmiàn bāo`. |
| `4109` | `国产` | `guóchǎn` | domestically produced | `conversational` | `selected_corpus_example` | `我的车是德国产的。` — Cross-boundary `德国 + 产`, aligned as `dé guóchǎn`. |
| `4260` | `间隔` | `jiàngé` | gap; interval | `conversational` | `selected_corpus_example` | `广东与广西之间隔着什么？` — `之间 + 隔着`, aligned as `zhī jiàngé`. |
| `4260` | `间隔` | `jiàngé` | gap; interval | `written` | `selected_corpus_example` | `他们之间隔着很远的距离。` — `之间 + 隔着`, aligned as `zhī jiàngé`. |
| `4382` | `科普` | `kēpǔ` | popular science | `conversational` | `selected_corpus_example` | `斯科普里是北马其顿的首都。` — Substring inside `斯科普里` (Skopje). |
| `4688` | `热点` | `rèdiǎn` | hot spot; focal point | `conversational` | `selected_corpus_example` | `天气热点儿没关系。` — `热 + 点儿` ("a bit hot"), aligned as `rèdiǎn ér`. |
| `4771` | `声调` | `shēngdiào` | tone (voice/Mandarin) | `written` | `selected_corpus_example` | `请把音乐声调小！` — `音乐声 + 调小` ("turn music down"), aligned as `shēngdiào xiǎo`. |
| `5244` | `再生` | `zàishēng` | regenerate; recycle | `conversational` | `selected_corpus_example` | `我希望下周不要再生病了。` — `再 + 生病`, aligned as `zàishēng bìng`. |

Also note **`5042 象棋`** (`Chinese chess`, `conversational` / `selected_corpus_example`): `您能教我下国际象棋吗？` uses `国际象棋` (Western chess) instead of Chinese chess (`中国象棋` / `象棋`).

---

## 5. Duplicate Sentences Across Headwords

**92 distinct sentences appear multiple times across different entries (`194` occurrences total)**—164 from `selected_corpus_example` and 30 from `reused_editorial_example`. In many cases, the **exact same sentence** is tagged `conversational` on one entry and `written` on another:

- `尽管受到暴君的迫害，英雄还顽强地斗争。` (`3923 斗争` `written`, `4958 顽强` `conversational`, `5187 英雄` `written`)
- `实践和理论同样重要，但我们倾向于重视后者而忽略前者。` (`4156 后者` `conversational`, `4639 前者` `written`, `4663 倾向` `written`)
- `在奥运会的竞赛中，金牌代表第一名，银牌代表第二名，铜牌是第三名。` (`4301 金牌` `written`, `4914 铜牌` `written`, `5177 银牌` `conversational`)
- `国际货币基金组织不考虑再借款给该国。` (`4201 货币` `conversational`, `4208 基金` `written`)
- `多亏了他的推荐，我得以在东京的一所大学里担任老师。` (`3883 得以` `conversational`, `3937 多亏` `written`)
- `外交谈判帮助结束了冲突。` (`3776 冲突` `written`, `4862 谈判` `conversational`)
- `公司由于缺乏资本倒闭了。` (`3877 倒闭` `conversational`, `5375 资本` `written`)
- `水是液体。冻起来就成了固体。` (`4083 固体` `conversational`, `5135 液体` `conversational`)

Each headword needs its own distinct, register-appropriate context rather than cross-card copies.

---

## 6. Corpus Hygiene, Formatting & Grammar/Content Defects

### A. Formatting, punctuation & multi-sentence issues
- **`25` multi-sentence examples** (`24` `selected_corpus_example`, `1` `newly_authored` at `3679 不安` `你怎么了？看起来很不安。`). Flashcards and TTS playback expect single-sentence examples unless dialogue is explicitly intended.
- **`37` punctuation/whitespace defects** (all `selected_corpus_example`), including:
  - ASCII commas/periods/colons/exclamation marks: `3896 点击` (`!`), `3944 恶心` (`,` and `.`), `3972 妨碍` / `4066 公正` (`:`), `4206 饥饿` (`.`), `4247 艰难` / `4795 使劲` (`,`), `4357 军队` (`.`), `4470 旅程` (`,` and `.`), `4744 伤口` (`,`, missing end punct), `4991 文物` (`,`).
  - Missing terminal punctuation: `4454 流程`, `4744 伤口`, `5035 香肠`, `5360 专利`.
  - Stray double punctuation / spaces: `5147 一道` (`…。.`), `4182 皇帝` (space after `，`), `4286 杰出` (`里奥· 梅西`), `4778 师父` (full-width `\u3000`).
- **Traditional character:** `4956 外甥` `written`: `她等著接外甥。` (`著` instead of `着`).

### B. Grammar errors, typos & mistranslations (`selected_corpus_example`)
- `3924 都市` (`written`): `阿尔及尔是一座有着超过三百多万人口的繁华都市。` (`超过` + `多` redundant/ungrammatical).
- `4114 过渡` / `4273 焦虑` / `5045 消除`: `…有帮于消除这些焦虑。` (typo `有帮于` for `有助于`).
- `4125 罕见` (`written`): `能在日本找到这样的大的院子实属罕见。` (ungrammatical `这样的大的`).
- `4454 流程` (`written`): `下面的图标显示了这个流程图` (`图标` "icon" instead of `图表` "chart", plus missing period).
- `4528 名胜` (`conversational`): `爱丁堡已经供应一个繁忙而传统的城市…` (broken translationese `供应一个…城市`).
- `4596 品尝` (`conversational`): `在上海一家酒吧开始售我最喜欢的啤酒…` (ungrammatical `开始售`).
- `4653 清晨` (`conversational`): `清晨，鲍勃遇见了她的祖父。` (pronoun mismatch: `Bob ... her grandfather`).
- `4714 融化` (`written`): `…势态更加严重。` (non-standard `势态` for `事态`/`态势`).
- `4741 闪电` (`conversational`): `一道闪电划破天空。` paired with English `"A sharp crack of thunder split the sky."` (lightning vs. thunder mismatch).
- `4818 输出` (`conversational`): `…尤其以丝绸和绵为主。` (typo `绵` for `棉`).
- `4830 衰老` (`conversational`): `衰老不得，智慧不得不得。` (garbled phrase).
- `4889 添加` (`conversational`): `我没有添加这句句子。` (unidiomatic `这句句子`).
- `4985 温柔` (`written`): `正的声音很温柔。` (truncated/broken subject).
- `5147 一道` (`conversational`): `…做为分界线。.` (`做为` for `作为`, plus trailing `.`).
- `5299 之所以` (`conversational`): `我们罢工之所以是因为公司没有涨我们的工资。` (ungrammatical `之所以是因为`).

### C. Unsuitable / non-pedagogical Tatoeba content
Selected corpus lines that do not fit clean HSK study cards:
- **Symbols, lyrics, slogans, memes:** `4002 符号` (`☭ 是一个共产主义的符号。`), `4182 皇帝` (Internationale lyrics), `5396 阻挡` (song lyrics), `3964 凡是` (`凡是反动的东西…`), `5364 转换` (`同志们，让我们转换莫斯科…`), `5384 自愿` (`我自愿加入中国共产党。`), `4259 鉴定` (`经鉴定，此人三观不正。`), `4802 势力` (1984 quote).
- **Profanity, crude humor, sensitive/graphic topics:** `4755 舌头` (`靠！我咬到自己舌头了。`), `4766 神经` (`你发神经了吗？`), `4631 恰恰` (`胸上无毛`), `4195 混合` (`呕吐物混合着烂肉`), `5166 议论` (`不男不女的人`), `5208 与其` (`我宁可自杀`), `4919 投票` (`穆斯林人和恐怖主义`), `5221 原始` (Latin Americans stereotype), `4667 情形` (Putin/Hu Jintao dream), `4329 镜头` (`很血腥`).

---

## 7. Systemic Mechanical Pinyin & Segmentation Bugs

Even though all 3,600 examples pass `alignPhrasePinyin` structurally, mechanical lexicon/ICU segmentation produced widespread polyphone and spacing bugs across both `newly_authored` and `selected_corpus_example`:

| Bug Pattern | Count | Example IDs & Sample Output | Expected Pinyin |
| --- | ---: | --- | --- |
| `中的` → `zhòngdì` | 25 | `3925 毒`, `3933 对应`, `4212 基因`, `4332 酒精`, `4421 朗读`, `4973 维生素`, `5298 脂肪`, `5342 珠宝` (`zhòngdì`) | `zhōng de` |
| Merged 4+ syllable / pronoun runs | 15 | `3752 撑` / `4107 棍` / `5254 扎` / `5294 支` (`Tāyòng`), `4750 上市` (`Zhè jiāgōng sī`), `4317 精通` (`yī ménwài yǔ`) | `Tā yòng`, `Zhè jiā gōngsī`, `yì mén wàiyǔ` |
| Classifier `只` → `zhǐ` | 10 | `3947 耳环`, `4050 公`, `4555 泥`, `5130 野`, `5374 捉` (`yī zhǐ` / `zhè zhǐ`) | `zhī` (`yì zhī` / `zhè zhī`) |
| `了当` → `liǎodàng` | 9 | `3741 超越`, `3895 地质` (`liǎodàng de de`), `4261 间接`, `4520 民俗`, `4596 品尝`, `4992 文献`, `5085 叙述` | `le dāng...` |
| `不知道` → `bùzhī dào` | 5 | `3807 传真`, `3881 倒是`, `4706 认同`, `4840 思念`, `5108 延期` | `bù zhīdào` |
| `到了` → `dàoliǎo` | 5 | `3943 躲避`, `4470 旅程`, `4836 水面`, `5157 一阵`, `5307 指定` | `dào le` |
| `长期`/`长时间` → `zhǎng` | 3 | `4317 精通` (`hěn zhǎng shíjiān`), `4803 视力`, `5233 晕` (`Zhǎng shíjiān`) | `cháng shíjiān` |
| `的哥` (`的哥哥`) → `dīgē` | 2 | `3987 分散` (`dīgē gē`), `4357 军队` (`Wǒ dīgē gē`) | `de gēge` |
| `美的` → `měidí` | 2 | `4305 金子` (`chéngjīng měidí`), `4923 透过` (`měidí`) | `jīngměi de`, `měi de` |
| `行业` → `xíng yè` | 2 | `4370 看好` (`zhè yīxíng yè`), `5134 业` (`xíng yè`) | `hángyè` |
| Other isolated polyphone/split bugs | 11+ | `4430 理` (`liǎoshì qíng`), `4450 料` (`liǎojié shí`), `4742 扇` (`ménjiàng`), `5153 仪式` (`zhòngjǔ xíng`), `5307 指定` (`zhòngxuǎn zé`), `5242 灾区` (`héshí pǐn`), `4836 水面` (`piào`), `4327 净` (`bǎshou xǐ gàn jìng`), `5399 钻` (`yònggōng jù`), `5397 祖国` (`hàoxué xí`), `3736 场面` (`xiàdéfādǒu`), `4910 同伴` (`zàihòu miàndī`) | `le shìqing`, `le jiēshi`, `mén jiāng`, `zhōng jǔxíng`, `zhōng xuǎnzé`, `hé shípǐn`, `piāo`, `bǎ shǒu xǐ gānjìng`, `yòng gōngjù`, `hǎohǎo xuéxí`, `xià de fādǒu`, `zài hòumian de` |

Also note that `3601–5400` introduces **671 Han characters absent from HSK 1–5**; before importing into `src/data/vocabulary/`, vocabulary font subsets in `src/styles.css` will need coverage verification (matching the Level 1–5 font workflow).

---

## 8. Recommended Remediation Plan

1. **Replace all `241` `replace_required` examples (`221` entries):**
   - Prioritize the `10` wrong-sense/substring-trap examples (`4282 结果`, `4588 片面`, `4109 国产`, `4260 间隔`, `4382 科普`, `4688 热点`, `4771 声调`, `5244 再生`), the `19` grammar/typo/Traditional defects, the `23` unsuitable corpus items, and dedupe the `92` duplicated sentence texts (`194` occurrences).
   - Use the `3701–5400` `newly_authored` style as the target template: crisp, everyday `conversational` sentences (`7–14` chars) and concise, realistic `written` sentences (`11–18` chars).
2. **Trim & align register on the `363` `trim_or_rewrite` examples:**
   - Replace/shorten the `176` `conversational` sentences `>16` chars (especially the `124` entries where `conversational` is `>4` chars longer than `written`) and the `190` `written` sentences `>20` chars (including the `20` verbose report-style sentences in `3601–3700`).
   - Fix spoken-in-written (`3703`, `3944`, `4174`, `5035`, etc.) and notice/literary-in-conversational (`3682 不得`, `3680 不曾`, `4013 该`, `4453 凌晨`, `5025 显著`) mismatches.
3. **Run a targeted pinyin & punctuation pass (`89` `fix_pinyin_or_format` + full audit):**
   - Fix all mechanical polyphone/segmentation bugs (`中的`, `了当`, `到了`, `只`, `长时间`, `行业`, `门将`, `了结实`, `好好学习`, `用工具`, `吓得`, `不知道`, `Tāyòng`, etc.) and normalize all punctuation to full-width Chinese punctuation (`，`, `。`, `？`, `！`) with no stray spaces or trailing periods.
   - Audit `一`/`不` tone sandhi and neutral-tone `个`/`们`/`的`/`地`/`得` consistency against HSK 1–5 before importing.
4. **Filter the TSV directly:** Open [hsk-level6-0.1.0-sentence-review.tsv](hsk-level6-0.1.0-sentence-review.tsv) and filter `review_status` in order: `replace_required` → `trim_or_rewrite` → `fix_pinyin_or_format`.
