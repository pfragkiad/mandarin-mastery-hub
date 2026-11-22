# HSK Level 1 — source-regression reconciliation and versioned release

**Date:** 2026-11-22  ·  **Status:** generated and structurally validated

## Executive summary

The v3.3.0 teaching lesson migration accidentally reused **vocabulary source v1.7.0** instead of **v1.7.1**. The schema migration preserved its input exactly, but the input itself was outdated: that is why the older examples returned. This was a source-selection failure, **not** a failure in the progress-contract validation. The release filename also failed to state the vocabulary dataset version.

| Version axis | Baseline | This corrective release |
|---|---|---|
| Lesson JSON Schema | 3.3.0 | **3.3.0 — unchanged** |
| Topic taxonomy | 2.0.0 | **2.0.0 — unchanged** |
| HSK Level 1 vocabulary | 1.7.0 | **1.7.1 — synchronized** |
| Core authoring documents | 3.3.0 | 3.3.0 Rev. 2 — guidance only |

## Correctly versioned output files

- `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1.zip` — **21 HSK Level 1 teaching lessons** with source `hsk3_level1_1.7.1.json`.
- `Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip` — **15 Conversational Mandarin lessons** with non-technical intros/checkpoint labels; two existing character lesson ZIPs unchanged.
- `Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip` — documentation-only improvements to authoring rules, 19 files; JSON Schemas unchanged.

## Source synchronization: exact findings

- **32** vocabulary entries changed examples between v1.7.0 and v1.7.1.
- **33** embedded example records repaired in **15** teaching lessons.
- **3** linked `production` question prompts, answers and checkpoint labels refreshed.
- One deliberate deviation retained: ID **36**, 电脑 (diànnǎo), `我在电脑上学习。` (wǒ zài diànnǎo shàng xuéxí.). The v1.7.1 source contains erroneous `shàngxué xí`; it has not been reintroduced.
- All **300/300** source IDs remain present exactly once. The other 268 source entries were not reauthored.
- All existing vocabulary item IDs, official syllabus references, lesson IDs, topic classifications, existing speaking/reveal/reading IDs and curriculum placements are preserved.

### Change counts by lesson

| Teaching lesson ZIP | Repaired examples |
|---|---:|
| `TOPIC_LESSON_ABILITIES_INTERESTS.zip` | 3 |
| `TOPIC_LESSON_ANIMALS_AND_WEATHER.zip` | 1 |
| `TOPIC_LESSON_BASIC_NEGATION_PARTICLES.zip` | 1 |
| `TOPIC_LESSON_CLOCK_AND_DAY.zip` | 1 |
| `TOPIC_LESSON_DATES_CALENDAR.zip` | 2 |
| `TOPIC_LESSON_FAMILY_AND_FRIENDS.zip` | 3 |
| `TOPIC_LESSON_FOOD_AND_MEALS.zip` | 2 |
| `TOPIC_LESSON_GETTING_AROUND.zip` | 1 |
| `TOPIC_LESSON_HEALTH_AND_REST.zip` | 2 |
| `TOPIC_LESSON_PEOPLE_AND_WORK.zip` | 1 |
| `TOPIC_LESSON_PERSONAL_PRONOUNS.zip` | 4 |
| `TOPIC_LESSON_QUANTITIES_CLASSIFIERS.zip` | 4 |
| `TOPIC_LESSON_QUESTIONS_AND_POINTING.zip` | 4 |
| `TOPIC_LESSON_SHOPPING_AND_THINGS.zip` | 3 |
| `TOPIC_LESSON_STUDYING_AND_LANGUAGE.zip` | 1 |

### Full 33-example-record audit (32 affected headwords)

| Syllabus ID | Headword | Lesson | Previous example | Restored v1.7.1 example |
|---:|---|---|---|---|
| 5 | 白天 (báitiān) | `topic-clock-and-day` | 白天我在学校学习。 (báitiān wǒ zài xuéxiào xuéxí.) | 学生们白天在学校学习。 (xuéshengmen báitiān zài xuéxiào xuéxí.) |
| 72 | 好吃 (hǎochī) | `topic-food-and-meals` | 这家饭店的面条儿很好吃。 (zhè jiā fàndiàn de miàntiáor hěn hǎochī.) | 这家饭店的面条很好吃。 (zhè jiā fàndiàn de miàntiáo hěn hǎochī.) |
| 75 | 好玩儿 (hǎowánr) | `topic-abilities-interests` | 这里有很多好玩儿的东西。 (zhèlǐ yǒu hěn duō hǎowánr de dōngxi.) | “这里有很多好玩儿的东西。”小朋友说。 (“zhèlǐ yǒu hěn duō hǎowánr de dōngxi.” xiǎopéngyǒu shuō.) |
| 76 | 号 (hào) | `topic-dates-calendar` | 十月五号是星期一。 (shí yuè wǔ hào shì xīngqīyī.) | 老师说：“十月五号不上课。” (lǎoshī shuō: “shí yuè wǔ hào bú shàngkè.”) |
| 82 | 会 (huì) | `topic-abilities-interests` | 我妹妹会唱歌。 (wǒ mèimei huì chàng gē.) | 她会写很多汉字。 (tā huì xiě hěn duō hànzì.) |
| 86 | 家 (jiā) | `topic-family-and-friends` | 我家有四个人。 (wǒ jiā yǒu sì gè rén.) | 他的家在学校旁边。 (tā de jiā zài xuéxiào pángbiān.) |
| 87 | 家人 (jiārén) | `topic-family-and-friends` | 我的家人都在中国。 (wǒ de jiārén dōu zài Zhōngguó.) | 星期天，他和家人一起去超市买东西。 (xīngqītiān, tā hé jiārén yìqǐ qù chāoshì mǎi dōngxi.) |
| 89 | 件 (jiàn) | `topic-quantities-classifiers` | 我有三件新衣服。 (wǒ yǒu sān jiàn xīn yīfu.) | 商店里有一件很漂亮的衣服。 (shāngdiàn lǐ yǒu yí jiàn hěn piàoliang de yīfu.) |
| 92 | 姐姐 (jiějie) | `topic-family-and-friends` | 我的姐姐今年二十岁。 (wǒ de jiějie jīnnián èr shí suì.) | 姐姐每天上午八点去公司上班。 (jiějie měitiān shàngwǔ bā diǎn qù gōngsī shàngbān.) |
| 104 | 口 (kǒu) | `topic-health-and-rest` | 他喝了三口水。 (tā hē le sān kǒu shuǐ.) | 天气很热，他回家后喝了三口水。 (tiānqì hěn rè, tā huí jiā hòu hē le sān kǒu shuǐ.) |
| 105 | 块 (kuài) | `topic-shopping-and-things` | 这本书二十块钱。 (zhè běn shū èr shí kuài qián.) | “这本书二十块钱。”她说。 (“zhè běn shū èrshí kuài qián.” tā shuō.) |
| 108 | 了 (le) | `topic-basic-negation-particles` | 我已经吃了早饭。 (wǒ yǐjīng chī le zǎofàn.) | 现在八点半了，学生们已经开始上课了。 (xiànzài bā diǎn bàn le, xuéshengmen yǐjīng kāishǐ shàngkè le.) |
| 127 | 面条儿 (miàntiáor) | `topic-food-and-meals` | 这家店的面条儿很好吃。 (zhè jiā diàn de miàntiáor hěn hǎochī.) | 这家店的面条很好吃。 (zhè jiā diàn de miàntiáo hěn hǎochī.) |
| 131 | 哪 (nǎ) | `topic-questions-and-pointing` | 你想读哪本书？ (nǐ xiǎng dú nǎ běn shū?) | 老师问：“你们想读哪本书？” (lǎoshī wèn: “nǐmen xiǎng dú nǎ běn shū?”) |
| 140 | 那儿 (nàr) | `topic-questions-and-pointing` | 请在那儿等老师。 (qǐng zài nàr děng lǎoshī.) | “请在那儿等老师。”她说。 (“qǐng zài nàr děng lǎoshī.” tā shuō.) |
| 145 | 能 (néng) | `topic-abilities-interests` | 今天下午你能来吗？ (jīntiān xiàwǔ nǐ néng lái ma?) | 学生们在这里能看书，也能学习。 (xuéshengmen zài zhèlǐ néng kàn shū, yě néng xuéxí.) |
| 148 | 你们 (nǐmen) | `topic-personal-pronouns` | 你们明天上午九点来。 (nǐmen míngtiān shàngwǔ jiǔ diǎn lái.) | 老师说：“你们明天上午九点来上课。” (lǎoshī shuō: “nǐmen míngtiān shàngwǔ jiǔ diǎn lái shàngkè.”) |
| 150 | 您 (nín) | `topic-personal-pronouns` | 您好，请进。 (nín hǎo, qǐng jìn.) | “您好，请进。”老师说。 (“nín hǎo, qǐng jìn.” lǎoshī shuō.) |
| 161 | 起床 (qǐchuáng) | `topic-health-and-rest` | 起床后，我喝一点儿水。 (qǐchuáng hòu, wǒ hē yìdiǎnr shuǐ.) | 学生们每天早上七点起床，八点上课。 (xuéshengmen měitiān zǎoshang qī diǎn qǐchuáng, bā diǎn shàngkè.) |
| 172 | 日 (rì) | `topic-dates-calendar` | 今天是十月十四日。 (jīntiān shì shí yuè shísì rì.) | 请问，今天是十月十四日吗？ (qǐngwèn, jīntiān shì shí yuè shísì rì ma?) |
| 176 | 上班 (shàngbān) | `topic-people-and-work` | 我的哥哥早上八点上班。 (wǒ de gēge zǎoshang bā diǎn shàngbān.) | 很多人每天早上八点上班。 (hěn duō rén měitiān zǎoshang bā diǎn shàngbān.) |
| 197 | 说话 (shuōhuà) | `topic-studying-and-language` | 请不要说话。 (qǐng bú yào shuōhuà.) | 你不要说话了，老师来了。 (nǐ bú yào shuōhuà le, lǎoshī lái le.) |
| 221 | 我 (wǒ) | `topic-personal-pronouns` | 我每天上午学习汉语。 (wǒ měitiān shàngwǔ xuéxí Hànyǔ.) | “我每天上午在学校学习汉语。”她说。 (“wǒ měitiān shàngwǔ zài xuéxiào xuéxí hànyǔ.” tā shuō.) |
| 222 | 我们 (wǒmen) | `topic-personal-pronouns` | 我们每天一起读书。 (wǒmen měitiān yìqǐ dúshū.) | 去年，我们一起在这个学校学习。 (qùnián, wǒmen yìqǐ zài zhè ge xuéxiào xuéxí.) |
| 226 | 下 (xià) | `topic-getting-around` | 书在椅子下。 (shū zài yǐzi xià.) | 书在椅子下面。 (shū zài yǐzi xiàmiàn.) |
| 258 | 一半 (yíbàn) | `topic-quantities-classifiers` | 这本书我读了一半。 (zhè běn shū wǒ dú le yíbàn.) | 今天有一半的学生没有来上课。 (jīntiān yǒu yíbàn de xuésheng méiyǒu lái shàngkè.) |
| 261 | 一点儿 (yìdiǎnr) | `topic-quantities-classifiers` | 请给我一点儿水。 (qǐng gěi wǒ yìdiǎnr shuǐ.) | “请给我一点儿水。”他说。 (“qǐng gěi wǒ yìdiǎnr shuǐ.” tā shuō.) |
| 265 | 有点儿 (yǒudiǎnr) | `topic-quantities-classifiers` | 这个饭店的菜有点儿贵。 (zhège fàndiàn de cài yǒudiǎnr guì.) | “这家饭店的菜有点儿贵。”她说。 (“zhè jiā fàndiàn de cài yǒudiǎnr guì.” tā shuō.) |
| 267 | 雨 (yǔ) | `topic-animals-and-weather` | 昨天下午下了很多雨。 (zuótiān xiàwǔ xià le hěn duō yǔ.) | 昨天下午下了很大的雨。 (zuótiān xiàwǔ xià le hěn dà de yǔ.) |
| 268 | 元 (yuán) | `topic-shopping-and-things` | 这个杯子十元。 (zhège bēizi shí yuán.) | 请问，这个杯子十元吗？ (qǐngwèn, zhè ge bēizi shí yuán ma?) |
| 268 | 元 (yuán) | `topic-shopping-and-things` | 这本书二十元。 (zhè běn shū èr shí yuán.) | 这本中文书二十元。 (zhè běn zhōngwén shū èrshí yuán.) |
| 277 | 怎么样 (zěnmeyàng) | `topic-questions-and-pointing` | 这个饭店怎么样？ (zhège fàndiàn zěnmeyàng?) | “这家饭店的菜怎么样？”他问。 (“zhè jiā fàndiàn de cài zěnmeyàng?” tā wèn.) |
| 283 | 这儿 (zhèr) | `topic-questions-and-pointing` | 这儿有一家书店。 (zhèr yǒu yì jiā shūdiàn.) | “这儿有一家书店。”她说。 (“zhèr yǒu yì jiā shūdiàn.” tā shuō.) |

### Three linked production questions

| Lesson ID | Question ID | Old prompt | New prompt |
|---|---|---|---|
| `topic-abilities-interests` | `q-17-5` | Write this in Mandarin: “My younger sister can sing.” | Write this in Mandarin: “She can write many Chinese characters.” |
| `topic-clock-and-day` | `q-07-5` | Write this in Mandarin: “I study at school during the day.” | Write this in Mandarin: “The students study at school during the day.” |
| `topic-dates-calendar` | `q-08-5` | Write this in Mandarin: “October 5 is a Monday.” | Write this in Mandarin: The teacher said, “There’s no class on October 5.” |

## Course-description regression

- **HSK curriculum before:** A proposed Level 1 path using 300 entries across 21 focused lessons. Later levels can add sections without reassigning lesson IDs.
- **HSK curriculum now:** Learn practical beginner Mandarin with 21 thematic lessons covering all 300 HSK 3.0 Level 1 vocabulary entries. Each lesson combines conversation, grammar, reading, speaking, and review.
- **Conversational curriculum before:** Independent, topic-based beginner Mandarin curriculum organized around communicative goals. Dialogues, expressions, teaching examples and activities are authored for this project, not reproduced as course-source transcripts. Topic inspiration does not establish direct source attribution.
- **Conversational curriculum now:** Practice useful Mandarin for everyday situations through 15 topic-based lessons with conversations, expressions, and speaking activities.
- Conversational lesson introductory blocks also contained technical statements about tracks and transcript attribution. These have been replaced with practical study introductions in 15 lessons. Actual provenance remains in each `report.md`.

## Progress-checkpoint labels

- **90** conversational block-checkpoint labels were rewritten from internal names to human-readable activities.
- No checkpoint ID, `target_id`, `optional` setting or course placement changed. That preserves stored user progress after an import/reordering.
- For HSK, only the three linked production-question labels were refreshed to reflect revised prompts. The 3 multiple-choice recall questions per lesson remain **optional**; required comprehension/production checks remain core.
- Existing applied-reading and applied-speaking practice records remain unchanged in the data. The frontend can choose presentation placement; this patch does not change completion math or remove checkpoints.

## Template and naming guardrails

- `Core v3.3.0 Rev. 2` adds release-source-pinning and learner-facing label guidance, including 5 example template labels; no JSON Schema changed and there is **no schema version bump**.
- All HSK teaching bundles must now use `..._v<lesson_schema>_taxonomy-v<taxonomy>_vocab-v<source_release>.zip`. The vocabulary version is mandatory even when it has no structural schema effect.
- The individual lesson ZIP filenames are stable and therefore remain the same; the versioned **outer bundle** encodes the source and contract versions.

## Validation detail

- 21/21 HSK lessons parse and pass the Draft 2020-12 topic JSON Schema v3.3.0.
- 15/15 Conversational lessons parse and pass the Draft 2020-12 general JSON Schema v3.2.0.
- Every nested lesson ZIP retains exactly 4 root files (canonical JSON, rendered HTML, rendered Markdown, `report.md`). All 21 HSK `report.md` files now clearly distinguish the original authoring snapshot from vocabulary v1.7.1 as the current source.
- HTML was regenerated with the full teaching plan, not the legacy vocabulary-only display. Progress checklists remain visible in HTML and Markdown.
- All previously authored HSK teaching content other than the 33 synchronized source-card records and 3 derived production questions is unchanged; separately authored reports have updated provenance metadata.
- Checkpoint IDs and `optional` flags are byte-equivalent at the value level before and after sync.
- Both independent character lesson ZIP payloads remain byte-identical.
- All outer and inner ZIP integrity checks passed.
- All Core JSON authoring templates validate against the unchanged current JSON Schemas.

## Limitations and editorial warnings

- Syllabus examples and pinyin are editorial, not independently native-speaker certified.
- Source v1.7.1 still requires a correction to the 电脑 (diànnǎo) example pinyin. This exception should be repaired upstream in a future source release rather than by undoing the lesson fix.
- This was a focused regression/data-lineage synchronization audit, not a complete pedagogical or native linguistic quality audit.
- Schema checks cannot determine whether examples are natural Mandarin; only comparisons with the pinned vocabulary source establish source consistency.

## Files inside the HSK archive

- `hsk3/level1/*.zip`: the 21 four-file lessons.
- `curricula/HSK3_2025_LEVEL1.json`: learner-facing course summary; identical lesson placement data.
- `audits/vocab_v171_example_changes.csv`: machine-readable 33-record diff.
- `audits/vocab_v171_question_changes.json`: 3 linked question revisions.
- `audits/vocab_v171_source_exceptions.json`: source pinyin exception.
- Historical audit files retained and clearly labeled as pertaining to the prior source revision.
