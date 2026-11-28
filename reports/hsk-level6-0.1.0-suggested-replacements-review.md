# HSK Level 6 Suggested Replacements — Validation & Next-Round Critical Candidates

- **Reviewed candidate file:** [hsk-level6-0.1.0-suggested-replacements.md](hsk-level6-0.1.0-suggested-replacements.md) (`25` proposed replacements)
- **Candidate file SHA-256:** `2d79ece8e19b8bdeb87c2ff8da5bf5631d47ddfbf5fc4783e65256fa079eccbe`
- **Source vocabulary file:** [hsk3_level6_0.1.0.json](../importer/hsk/hsk3_level6_0.1.0.json) (`data_version`: `0.1.0`, SHA-256 `359d066fbc59138dcc88cdb00cb054bb8c85a64cfb99d2ba7bb912bd8b6cbc47`)
- **Full-dataset baseline:** [hsk-level6-0.1.0-sentence-review.md](hsk-level6-0.1.0-sentence-review.md) and [hsk-level6-0.1.0-sentence-review.tsv](hsk-level6-0.1.0-sentence-review.tsv)
- **Scope:** Review of the `4` marginal/minor-polish items in [hsk-level6-0.1.0-suggested-replacements.md](hsk-level6-0.1.0-suggested-replacements.md) (omitting the `21` passed candidates), plus **`44` new candidate replacements** for critical and marginal failing entries in [hsk3_level6_0.1.0.json](../importer/hsk/hsk3_level6_0.1.0.json). Nothing in the source JSON or the earlier candidate file was modified.

---

## 1. Validation Summary of Existing 25 Candidates

All `25` items in [hsk-level6-0.1.0-suggested-replacements.md](hsk-level6-0.1.0-suggested-replacements.md) match [hsk3_level6_0.1.0.json](../importer/hsk/hsk3_level6_0.1.0.json) (`id`, `headword`, `pinyin`, `style`, `register`, `Current Chinese`), match claimed character counts (`9–16` `conversational`, `9–19` `written`), contain the exact target headword, pass `alignPhrasePinyin`, and introduce `0` duplicates.

- **Passed cleanly (`21` items — omitted from detail below):** `5182`, `3814`, `4264`, `5296`, `4457`, `4323`, `4151`, `3671`, `3691`, `3645`, `3693`, `3682`, `3669`, `4013`, `3643`, `3611`, `3625`, `3674`, `3681`, `5369`, `5393`.
- **Marginal / minor-polish items (`4` items):** `3775`, `3680`, `3660`, `3678`.

### Marginal Items from `hsk-level6-0.1.0-suggested-replacements.md`

| ID | Headword | Style | Proposed Chinese (`chars`) | Issue & Suggested Polish |
| ---: | --- | --- | --- | --- |
| `3775` | `充实` | `conversational` | `最近实习很充实，学了不少东西。` (`15`) | Sentence is good; change `bù shǎo` → `bùshǎo` in `Proposed pinyin` to match all `7` existing `不少` instances in `hsk3_level6_0.1.0.json`. |
| `3680` | `不曾` | `conversational` | `你说的地方，我不曾去过。` (`12`) | `qùguo` follows standard Hanyu Pinyin orthography, whereas `hsk3_level6_0.1.0.json` writes `qù guò` (`3680` current `Wǒ bùcéng qù guò nàlǐ.`); standardize across Level 6. |
| `3660` | `兵` | `written` | `守城的兵日夜轮流站岗。` (`11`) | Grammatical with standalone `兵`, though `守城的兵` feels slightly historical/story-like; a modern `plain_written` option (`一批新兵已完成基础训练。`, `12` chars) or keeping `士兵` is also viable. |
| `3678` | `布` | `written` | `她从箱中取出一块白布。` (`11`) | Clean and specific; `她从箱子里取出一块白布。` (`12` chars) reads slightly smoother in modern prose than `箱中`. |

---

## 2. New Candidates for Critical & Marginal Blockers (`44` Examples)

All `44` candidates below target **only failing/critical or marginal items** from [hsk-level6-0.1.0-sentence-review.tsv](hsk-level6-0.1.0-sentence-review.tsv) (none of the `pass_candidate` rows). Every candidate was checked against `hsk3_level6_0.1.0.json` and passed `alignPhrasePinyin`, length ceilings (`≤16` `conversational`, `≤20` `written`), target-headword/reading containment, and zero-duplication checks. Character counts include punctuation; pinyin and English are editorial proposals pending native-speaker review.

### A. Critical Wrong-Sense & Cross-Boundary Substring Traps (`10` items)

#### 4282 结果 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `jiēguǒ` (`to bear fruit`).
- **Current Chinese:** 结果什么时候宣布？ (`reused_editorial_example` — HSK4 `jiéguǒ` *"result"* mis-read as `Jiēguǒ`).
- **Proposed Chinese:** 桃树今年结果了吗？ (9 characters)
- **Proposed pinyin:** Táoshù jīnnián jiēguǒ le ma?
- **Proposed English:** Did the peach tree bear fruit this year?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4282 结果 (written)
- **Example:** `written` / `plain_written`. **Headword reading:** `jiēguǒ` (`to bear fruit`).
- **Current Chinese:** 研究人员比较了人工分类和自动分类的结果。 (`reused_editorial_example` — HSK4 `jiéguǒ` *"result"* mis-read as `jiēguǒ`).
- **Proposed Chinese:** 果树一般在秋季开花结果。 (12 characters)
- **Proposed pinyin:** Guǒshù yìbān zài qiūjì kāihuā jiēguǒ.
- **Proposed English:** Fruit trees generally blossom and bear fruit in autumn.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4588 片面 (written)
- **Example:** `written` / `plain_written`. **Headword reading:** `piànmiàn`.
- **Current Chinese:** 他吃了两片面包。 (`reused_editorial_example` — `片 + 面包`, aligned as `piànmiàn bāo`).
- **Proposed Chinese:** 仅凭一面之词得出结论未免片面。 (15 characters)
- **Proposed pinyin:** Jǐn píng yímiàn zhī cí déchū jiélùn wèimiǎn piànmiàn.
- **Proposed English:** Drawing a conclusion from only one side of the story is somewhat one-sided.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4109 国产 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `guóchǎn`.
- **Current Chinese:** 我的车是德国产的。 (`selected_corpus_example` — `德国 + 产`, aligned as `dé guóchǎn`).
- **Proposed Chinese:** 你用过这款国产手机吗？ (11 characters)
- **Proposed pinyin:** Nǐ yòng guò zhè kuǎn guóchǎn shǒujī ma?
- **Proposed English:** Have you used this domestically made phone?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4260 间隔 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `jiàngé`.
- **Current Chinese:** 广东与广西之间隔着什么？ (`selected_corpus_example` — `之间 + 隔着`, aligned as `zhī jiàngé`).
- **Proposed Chinese:** 两班车之间间隔多久？ (10 characters)
- **Proposed pinyin:** Liǎng bān chē zhījiān jiàngé duōjiǔ?
- **Proposed English:** What is the interval between the two buses?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4260 间隔 (written)
- **Example:** `written` / `plain_written`. **Headword reading:** `jiàngé`.
- **Current Chinese:** 他们之间隔着很远的距离。 (`selected_corpus_example` — `之间 + 隔着`, aligned as `zhī jiàngé`).
- **Proposed Chinese:** 请保持适当的行车间隔。 (11 characters)
- **Proposed pinyin:** Qǐng bǎochí shìdàng de xíngchē jiàngé.
- **Proposed English:** Please maintain an appropriate spacing between vehicles.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4382 科普 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `kēpǔ`.
- **Current Chinese:** 斯科普里是北马其顿的首都。 (`selected_corpus_example` — substring inside `斯科普里` / Skopje).
- **Proposed Chinese:** 你平时看哪类科普视频？ (11 characters)
- **Proposed pinyin:** Nǐ píngshí kàn nǎ lèi kēpǔ shìpín?
- **Proposed English:** What kind of popular-science videos do you usually watch?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4688 热点 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `rèdiǎn`.
- **Current Chinese:** 天气热点儿没关系。 (`selected_corpus_example` — `热 + 点儿`, aligned as `rèdiǎn ér`).
- **Proposed Chinese:** 最近网上有什么新闻热点？ (12 characters)
- **Proposed pinyin:** Zuìjìn wǎngshàng yǒu shénme xīnwén rèdiǎn?
- **Proposed English:** What are the trending news topics online lately?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4771 声调 (written)
- **Example:** `written` / `plain_written`. **Headword reading:** `shēngdiào`.
- **Current Chinese:** 请把音乐声调小！ (`selected_corpus_example` — `音乐声 + 调小`, aligned as `shēngdiào xiǎo`).
- **Proposed Chinese:** 普通话共有四个基本声调。 (12 characters)
- **Proposed pinyin:** Pǔtōnghuà gòngyǒu sì gè jīběn shēngdiào.
- **Proposed English:** Mandarin Chinese has four basic tones.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5244 再生 (conversational)
- **Example:** `conversational` / `neutral_spoken`. **Headword reading:** `zàishēng`.
- **Current Chinese:** 我希望下周不要再生病了。 (`selected_corpus_example` — `再 + 生病`, aligned as `zàishēng bìng`).
- **Proposed Chinese:** 这些废纸还能再生利用吗？ (12 characters)
- **Proposed pinyin:** Zhèxiē fèizhǐ hái néng zàishēng lìyòng ma?
- **Proposed English:** Can this waste paper still be recycled?
- **Your decision:** Pending. **Validation notes:** [add notes].

---

### B. Grammar, Typo, Traditional Character, Truncated & Mistranslated Defects (`20` items)

#### 3924 都市 (written)
- **Current Chinese:** 阿尔及尔是一座有着超过三百多万人口的繁华都市。 (redundant `超过三百多万`, `23` chars).
- **Proposed Chinese:** 这座现代化都市吸引了众多青年才俊。 (17 characters)
- **Proposed pinyin:** Zhè zuò xiàndàihuà dūshì xīyǐn le zhòngduō qīngnián cáijùn.
- **Proposed English:** This modern metropolis attracted many talented young people.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4114 过渡 (conversational)
- **Current Chinese:** 证实她顺利地过渡入皇室组织，有帮于消除这些焦虑。 (typo `有帮于`, formal/duplicated, `24` chars).
- **Proposed Chinese:** 我刚来，还在过渡阶段呢。 (12 characters)
- **Proposed pinyin:** Wǒ gāng lái, hái zài guòdù jiēduàn ne.
- **Proposed English:** I just arrived; I'm still in the transition phase.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4125 罕见 (written)
- **Current Chinese:** 能在日本找到这样的大的院子实属罕见。 (ungrammatical `这样的大的`).
- **Proposed Chinese:** 这种高山植物在本地极为罕见。 (14 characters)
- **Proposed pinyin:** Zhè zhǒng gāoshān zhíwù zài běndì jíwéi hǎnjiàn.
- **Proposed English:** This alpine plant is extremely rare locally.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4273 焦虑 (written)
- **Current Chinese:** 证实她顺利地过渡入皇室组织，有帮于消除这些焦虑。 (typo `有帮于`, duplicated 3x, `24` chars).
- **Proposed Chinese:** 适度运动有助于缓解日常焦虑。 (14 characters)
- **Proposed pinyin:** Shìdù yùndòng yǒuzhùyú huǎnjiě rìcháng jiāolǜ.
- **Proposed English:** Moderate exercise helps relieve everyday anxiety.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4454 流程 (written)
- **Current Chinese:** 下面的图标显示了这个流程图 (`图标` typo for `图表`, missing period, `written` matches `13` chars).
- **Proposed Chinese:** 新系统简化了审批流程。 (11 characters)
- **Proposed pinyin:** Xīn xìtǒng jiǎnhuà le shěnpī liúchéng.
- **Proposed English:** The new system simplified the approval workflow.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4528 名胜 (conversational)
- **Current Chinese:** 爱丁堡已经供应一个繁忙而传统的城市，有许多历史性的建筑物和名胜。 (broken `供应一个…城市`, `32` chars).
- **Proposed Chinese:** 这座城市有哪些必去的名胜？ (13 characters)
- **Proposed pinyin:** Zhè zuò chéngshì yǒu nǎxiē bì qù de míngshèng?
- **Proposed English:** Which scenic spots are must-visits in this city?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4596 品尝 (conversational)
- **Current Chinese:** 在上海一家酒吧开始售我最喜欢的啤酒，所以我趁这个机会好好品尝。 (ungrammatical `开始售…`, `31` chars).
- **Proposed Chinese:** 快来品尝一下我做的点心。 (12 characters)
- **Proposed pinyin:** Kuài lái pǐncháng yíxià wǒ zuò de diǎnxin.
- **Proposed English:** Come taste the pastries I made.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4653 清晨 (conversational)
- **Current Chinese:** 清晨，鲍勃遇见了她的祖父。 (pronoun mismatch `Bob` vs `她`).
- **Proposed Chinese:** 我每天清晨都会去公园散步。 (13 characters)
- **Proposed pinyin:** Wǒ měitiān qīngchén dōu huì qù gōngyuán sànbù.
- **Proposed English:** I go for a walk in the park early every morning.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4714 融化 (written)
- **Current Chinese:** 融化中的极地冰盖也可以使海平面上涨的势态更加严重。 (non-standard `势态`, `zhòngdì` pinyin bug, `25` chars).
- **Proposed Chinese:** 气温回升后，积雪开始融化。 (13 characters)
- **Proposed pinyin:** Qìwēn huíshēng hòu, jīxuě kāishǐ rónghuà.
- **Proposed English:** After temperatures rose, the snow began to melt.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4741 闪电 (conversational)
- **Current Chinese:** 一道闪电划破天空。 (English `"A sharp crack of thunder split the sky."` mismatches lightning vs. thunder; `written` register).
- **Proposed Chinese:** 刚才的闪电太亮了！ (9 characters)
- **Proposed pinyin:** Gāngcái de shǎndiàn tài liàng le!
- **Proposed English:** The lightning just now was so bright!
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4778 师父 (conversational)
- **Current Chinese:** “拜个不够行的师父，很伤脑筋吧？”　“我也很笨，所以没关系。” (translationese, full-width space, `31` chars).
- **Proposed Chinese:** 这位师父的手艺真不错。 (11 characters)
- **Proposed pinyin:** Zhè wèi shīfu de shǒuyì zhēn búcuò.
- **Proposed English:** This master craftsperson's skill is really impressive.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4818 输出 (conversational)
- **Current Chinese:** 他们主要输出的产品是纺织品，尤其以丝绸和绵为主。 (typo `绵` for `棉`, `written` style, `24` chars).
- **Proposed Chinese:** 这台机器能输出什么格式？ (12 characters)
- **Proposed pinyin:** Zhè tái jīqì néng shūchū shénme géshì?
- **Proposed English:** What formats can this machine output?
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4830 衰老 (conversational)
- **Current Chinese:** 衰老不得，智慧不得不得。 (garbled phrase).
- **Proposed Chinese:** 平时多运动能延缓衰老。 (11 characters)
- **Proposed pinyin:** Píngshí duō yùndòng néng yánhuǎn shuāilǎo.
- **Proposed English:** Exercising regularly can slow down aging.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4889 添加 (conversational)
- **Current Chinese:** 我没有添加这句句子。 (unidiomatic `这句句子`).
- **Proposed Chinese:** 菜太淡了，再添加一点盐吧。 (13 characters)
- **Proposed pinyin:** Cài tài dàn le, zài tiānjiā yìdiǎn yán ba.
- **Proposed English:** The dish is too bland; add a little more salt.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4956 外甥 (written)
- **Current Chinese:** 她等著接外甥。 (Traditional `著`, casual fragment `7` chars).
- **Proposed Chinese:** 周末她带外甥去参观博物馆。 (13 characters)
- **Proposed pinyin:** Zhōumò tā dài wàisheng qù cānguān bówùguǎn.
- **Proposed English:** She took her nephew to visit the museum on the weekend.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4985 温柔 (written)
- **Current Chinese:** 正的声音很温柔。 (truncated/broken subject `正`, `8` chars).
- **Proposed Chinese:** 她用温柔的语气安慰着孩子。 (13 characters)
- **Proposed pinyin:** Tā yòng wēnróu de yǔqì ānwèi zhe háizi.
- **Proposed English:** She comforted the child in a gentle tone.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5045 消除 (written)
- **Current Chinese:** 证实她顺利地过渡入皇室组织，有帮于消除这些焦虑。 (typo `有帮于`, duplicated 3x, `24` chars).
- **Proposed Chinese:** 仔细检查消除了潜在的安全隐患。 (15 characters)
- **Proposed pinyin:** Zǐxì jiǎnchá xiāochú le qiánzài de ānquán yǐnhuàn.
- **Proposed English:** Careful inspection eliminated potential safety hazards.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5147 一道 (conversational)
- **Current Chinese:** 我家院子和邻居家院子之间有一道篱笆做为分界线。. (typo `做为`, stray trailing `.`, `24` chars; note headword `yídào` = *"together"*).
- **Proposed Chinese:** 我们一道去车站吧。 (9 characters)
- **Proposed pinyin:** Wǒmen yídào qù chēzhàn ba.
- **Proposed English:** Let's go to the station together.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5299 之所以 (conversational)
- **Current Chinese:** 我们罢工之所以是因为公司没有涨我们的工资。 (ungrammatical `之所以是因为`, `21` chars).
- **Proposed Chinese:** 我之所以早起，是因为要赶早班车。 (16 characters)
- **Proposed pinyin:** Wǒ zhīsuǒyǐ zǎoqǐ, shì yīnwèi yào gǎn zǎobānchē.
- **Proposed English:** The reason I got up early is that I had to catch the early bus.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5360 专利 (conversational)
- **Current Chinese:** 英特尔公司由那个发明取得着巨大的专利权收入 (unidiomatic `取得着`, missing period, `21` chars).
- **Proposed Chinese:** 这项设计已经申请专利了吗？ (13 characters)
- **Proposed pinyin:** Zhè xiàng shèjì yǐjīng shēnqǐng zhuānlì le ma?
- **Proposed English:** Has a patent been applied for on this design?
- **Your decision:** Pending. **Validation notes:** [add notes].

---

### C. High-Priority Unsuitable / Oversized Corpus Items (`14` items)

#### 4002 符号 (written)
- **Current Chinese:** ☭ 是一个共产主义的符号。 (non-text Unicode symbol + political).
- **Proposed Chinese:** 地图上用不同符号表示各类设施。 (15 characters)
- **Proposed pinyin:** Dìtú shàng yòng bù tóng fúhào biǎoshì gè lèi shèshī.
- **Proposed English:** Different symbols are used on the map to indicate various facilities.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4755 舌头 (conversational)
- **Current Chinese:** 靠！我咬到自己舌头了。 (profanity `靠！`).
- **Proposed Chinese:** 吃太烫的面条小心烫到舌头。 (13 characters)
- **Proposed pinyin:** Chī tài tàng de miàntiáo xiǎoxīn tàng dào shétou.
- **Proposed English:** Be careful not to burn your tongue on noodles that are too hot.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4766 神经 (conversational)
- **Current Chinese:** 你发神经了吗？ (rude insult).
- **Proposed Chinese:** 最近太累，我神经一直绷得很紧。 (15 characters)
- **Proposed pinyin:** Zuìjìn tài lèi, wǒ shénjīng yìzhí bēng de hěn jǐn.
- **Proposed English:** I've been so tired lately that my nerves are constantly on edge.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5208 与其 (conversational)
- **Current Chinese:** 与其向命运妥协，我宁可自杀。 (unnecessary suicide mention).
- **Proposed Chinese:** 与其在这儿干等，不如先去吃饭。 (15 characters)
- **Proposed pinyin:** Yǔqí zài zhèr gānděng, bùrú xiān qù chīfàn.
- **Proposed English:** Rather than waiting around here, we might as well go eat first.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 3964 凡是 (conversational)
- **Current Chinese:** 凡是反动的东西，你不打，它就不倒。 (political slogan quote, `17` chars).
- **Proposed Chinese:** 凡是能帮上忙的，我一定去。 (13 characters)
- **Proposed pinyin:** Fánshì néng bāng shàng máng de, wǒ yídìng qù.
- **Proposed English:** Whenever there is something I can help with, I will definitely go.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5364 转换 (conversational)
- **Current Chinese:** 同志们，让我们转换莫斯科为理想的共产主义城市。 (political slogan, `23` chars).
- **Proposed Chinese:** 我想出去走走，转换一下心情。 (14 characters)
- **Proposed pinyin:** Wǒ xiǎng chūqù zǒuzou, zhuǎnhuàn yíxià xīnqíng.
- **Proposed English:** I want to go out for a walk and get a change of mood.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5384 自愿 (conversational)
- **Current Chinese:** 我自愿加入中国共产党。 (political affiliation pledge).
- **Proposed Chinese:** 去不去都可以，完全自愿。 (12 characters)
- **Proposed pinyin:** Qù bú qù dōu kěyǐ, wánquán zìyuàn.
- **Proposed English:** Whether you go or not is fine; it's completely voluntary.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4259 鉴定 (conversational)
- **Current Chinese:** 经鉴定，此人三观不正。 (internet meme slang, formal `此人`).
- **Proposed Chinese:** 这块玉要去专业机构鉴定一下。 (14 characters)
- **Proposed pinyin:** Zhè kuài yù yào qù zhuānyè jīgòu jiàndìng yíxià.
- **Proposed English:** This piece of jade needs to be authenticated by a specialist agency.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4631 恰恰 (conversational)
- **Current Chinese:** 当我还是年轻人的时候，我脑袋上有很多头发，胸上无毛。现在，恰恰相反。 (crude joke, `34` chars).
- **Proposed Chinese:** 我正找他呢，他恰恰刚回来。 (13 characters)
- **Proposed pinyin:** Wǒ zhèng zhǎo tā ne, tā qiàqià gāng huílái.
- **Proposed English:** I was just looking for him, and as it happens he just got back.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4667 情形 (written)
- **Current Chinese:** 普京对胡锦涛说：“咱们必须帮吉尔吉斯斯坦”……不过那只是在我梦里的情形。 (geopolitical joke, `36` chars).
- **Proposed Chinese:** 现场工作人员详细记录了当时的情形。 (17 characters)
- **Proposed pinyin:** Xiànchǎng gōngzuò rényuán xiángxì jìlù le dāngshí de qíngxing.
- **Proposed English:** On-site staff recorded the circumstances at the time in detail.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 4919 投票 (written)
- **Current Chinese:** 根据美国国民的一个投票，人们普遍认为穆斯林人和恐怖主义有关。 (sensitive political/religious poll, `30` chars).
- **Proposed Chinese:** 全体成员以无记名投票决定最终方案。 (17 characters)
- **Proposed pinyin:** Quántǐ chéngyuán yǐ wújìmíng tóupiào juédìng zuìzhōng fāng’àn.
- **Proposed English:** All members decided on the final plan by secret ballot.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5166 议论 (written)
- **Current Chinese:** 看起来不男不女的人常常受到议论和歧视。 (derogatory phrasing, `19` chars).
- **Proposed Chinese:** 这项新规定公布后引发了广泛议论。 (16 characters)
- **Proposed pinyin:** Zhè xiàng xīn guīdìng gōngbù hòu yǐnfā le guǎngfàn yìlùn.
- **Proposed English:** After the new regulation was announced, it sparked widespread discussion.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5042 象棋 (conversational)
- **Current Chinese:** 您能教我下国际象棋吗？ (`国际象棋` = Western chess vs headword `象棋` = Chinese chess).
- **Proposed Chinese:** 爷爷晚饭后常去公园下象棋。 (13 characters)
- **Proposed pinyin:** Yéye wǎnfàn hòu cháng qù gōngyuán xià xiàngqí.
- **Proposed English:** Grandpa often goes to the park to play Chinese chess after dinner.
- **Your decision:** Pending. **Validation notes:** [add notes].

#### 5042 象棋 (written)
- **Current Chinese:** 我不喜欢出去玩，常常在家泡壶咖啡，跟朋友下围棋象棋。 (`26` chars, casual `written`, unidiomatic `下围棋象棋`).
- **Proposed Chinese:** 中国象棋有着悠久的历史传统。 (14 characters)
- **Proposed pinyin:** Zhōngguó xiàngqí yǒuzhe yōujiǔ de lìshǐ chuántǒng.
- **Proposed English:** Chinese chess has a long historical tradition.
- **Your decision:** Pending. **Validation notes:** [add notes].
