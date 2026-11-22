# Lesson handoff v3.3.0 — word-example regression report

Date: 2026-11-22. Compares the supplied `Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip` against the lessons currently in the app (imported from the v3.2.0 / vocab-v1.7.1 package, commit `aab4693e`) and against the Vocabulary word cards (`src/data/vocabulary/level-1.json`).

## Verdict

- **33 word-card example sentences** in **15 lessons** differ. In **33 of 33** the handoff text is exactly the version the app had *before* the vocab-v1.7.1 update (`aab4693e^`), so the handoff was generated from an older lesson base. No other differences.
- The current app version matches the Vocabulary word card in **33 of 33** cases — the current examples are the newer ones.
- **3 "Write this in Mandarin" questions** reverted to the older answer (3 of 3 match the pre-update version exactly).
- **11 lessons** lost character references (`catalog_character_refs`) that the newer sentences need.
- Everything else (teaching plans, dialogues, IDs, course order) is unchanged apart from the new progress fields.

**Resolution in the app:** the newer (current) examples, questions and character references were kept; only the new v3.3 fields (progress checkpoints, estimated minutes, substitution/reading IDs, subtopic fields, schema versions) were taken from the handoff. Validated with the v3.3.0 schemas; 38 lessons, 549 required / 64 optional checkpoints.

**For the lesson creator:** regenerate v3.3.0 from the v3.2.0 (vocab-v1.7.1) lesson files, not the earlier base. The course descriptions (HSK3_2025_LEVEL1, CONVERSATIONAL_MANDARIN) were also reverted to older developer-facing copy.

## Word-card examples

| Lesson | Word (HSK #) | Ex. | Handoff (older) | App (newer, kept) | Matches word card | Fields changed |
|---|---|---|---|---|---|---|
| What I Can and Want to Do | 会 (#82) | 2 | 我妹妹会唱歌。 | 她会写很多汉字。 | yes | hanzi, pinyin, english, teaching_note |
| What I Can and Want to Do | 能 (#145) | 2 | 今天下午你能来吗？ | 学生们在这里能看书，也能学习。 | yes | hanzi, pinyin, english, teaching_note |
| What I Can and Want to Do | 好玩儿 (#75) | 2 | 这里有很多好玩儿的东西。 | “这里有很多好玩儿的东西。”小朋友说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Animals and Weather | 雨 (#267) | 2 | 昨天下午下了很多雨。 | 昨天下午下了很大的雨。 | yes | hanzi, pinyin, english, teaching_note |
| Making Basic Statements | 了 (#108) | 2 | 我已经吃了早饭。 | 现在八点半了，学生们已经开始上课了。 | yes | hanzi, pinyin, english, teaching_note |
| Talking About the Clock | 白天 (#5) | 2 | 白天我在学校学习。 | 学生们白天在学校学习。 | yes | hanzi, pinyin, english, teaching_note |
| Days, Months and Years | 号 (#76) | 2 | 十月五号是星期一。 | 老师说：“十月五号不上课。” | yes | hanzi, pinyin, english, register, teaching_note |
| Days, Months and Years | 日 (#172) | 1 | 今天是十月十四日。 | 请问，今天是十月十四日吗？ | yes | hanzi, pinyin, english, register, teaching_note |
| Introducing Family and Friends | 家 (#86) | 2 | 我家有四个人。 | 他的家在学校旁边。 | yes | hanzi, pinyin, english, teaching_note |
| Introducing Family and Friends | 家人 (#87) | 2 | 我的家人都在中国。 | 星期天，他和家人一起去超市买东西。 | yes | hanzi, pinyin, english, teaching_note |
| Introducing Family and Friends | 姐姐 (#92) | 2 | 我的姐姐今年二十岁。 | 姐姐每天上午八点去公司上班。 | yes | hanzi, pinyin, english, teaching_note |
| Food and Drink | 好吃 (#72) | 2 | 这家饭店的面条儿很好吃。 | 这家饭店的面条很好吃。 | yes | hanzi, pinyin, teaching_note |
| Food and Drink | 面条儿 (#127) | 2 | 这家店的面条儿很好吃。 | 这家店的面条很好吃。 | yes | hanzi, pinyin, teaching_note |
| Getting Around | 下 (#226) | 2 | 书在椅子下。 | 书在椅子下面。 | yes | hanzi, pinyin, teaching_note |
| Health and Rest | 口 (#104) | 2 | 他喝了三口水。 | 天气很热，他回家后喝了三口水。 | yes | hanzi, pinyin, english, teaching_note |
| Health and Rest | 起床 (#161) | 2 | 起床后，我喝一点儿水。 | 学生们每天早上七点起床，八点上课。 | yes | hanzi, pinyin, english, teaching_note |
| Introducing People and Work | 上班 (#176) | 2 | 我的哥哥早上八点上班。 | 很多人每天早上八点上班。 | yes | hanzi, pinyin, english, teaching_note |
| Talking About People | 你们 (#148) | 2 | 你们明天上午九点来。 | 老师说：“你们明天上午九点来上课。” | yes | hanzi, pinyin, english, register, teaching_note |
| Talking About People | 您 (#150) | 2 | 您好，请进。 | “您好，请进。”老师说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Talking About People | 我 (#221) | 2 | 我每天上午学习汉语。 | “我每天上午在学校学习汉语。”她说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Talking About People | 我们 (#222) | 2 | 我们每天一起读书。 | 去年，我们一起在这个学校学习。 | yes | hanzi, pinyin, english, teaching_note |
| Counting Real Things | 件 (#89) | 2 | 我有三件新衣服。 | 商店里有一件很漂亮的衣服。 | yes | hanzi, pinyin, english, teaching_note |
| Counting Real Things | 一半 (#258) | 2 | 这本书我读了一半。 | 今天有一半的学生没有来上课。 | yes | hanzi, pinyin, english, teaching_note |
| Counting Real Things | 一点儿 (#261) | 2 | 请给我一点儿水。 | “请给我一点儿水。”他说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Counting Real Things | 有点儿 (#265) | 2 | 这个饭店的菜有点儿贵。 | “这家饭店的菜有点儿贵。”她说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Asking and Pointing | 哪 (#131) | 2 | 你想读哪本书？ | 老师问：“你们想读哪本书？” | yes | hanzi, pinyin, english, register, teaching_note |
| Asking and Pointing | 那儿 (#140) | 2 | 请在那儿等老师。 | “请在那儿等老师。”她说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Asking and Pointing | 怎么样 (#277) | 2 | 这个饭店怎么样？ | “这家饭店的菜怎么样？”他问。 | yes | hanzi, pinyin, english, register, teaching_note |
| Asking and Pointing | 这儿 (#283) | 2 | 这儿有一家书店。 | “这儿有一家书店。”她说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Buying Everyday Things | 块 (#105) | 2 | 这本书二十块钱。 | “这本书二十块钱。”她说。 | yes | hanzi, pinyin, english, register, teaching_note |
| Buying Everyday Things | 元 (#268) | 1 | 这个杯子十元。 | 请问，这个杯子十元吗？ | yes | hanzi, pinyin, english, register, teaching_note |
| Buying Everyday Things | 元 (#268) | 2 | 这本书二十元。 | 这本中文书二十元。 | yes | hanzi, pinyin, english, teaching_note |
| Learning Chinese | 说话 (#197) | 1 | 请不要说话。 | 你不要说话了，老师来了。 | yes | hanzi, pinyin, english, register, teaching_note |

## Practice questions

| Lesson | Question | Handoff answer (older) | App answer (newer, kept) |
|---|---|---|---|
| What I Can and Want to Do | q-17-5 | 我妹妹会唱歌。 (wǒ mèimei huì chàng gē.) | 她会写很多汉字。 (tā huì xiě hěn duō hànzì.) |
| Talking About the Clock | q-07-5 | 白天我在学校学习。 (báitiān wǒ zài xuéxiào xuéxí.) | 学生们白天在学校学习。 (xuéshengmen báitiān zài xuéxiào xuéxí.) |
| Days, Months and Years | q-08-5 | 十月五号是星期一。 (shí yuè wǔ hào shì xīngqīyī.) | 老师说：“十月五号不上课。” (lǎoshī shuō: “shí yuè wǔ hào bú shàngkè.”) |

## Character references missing from the handoff

| Lesson | Characters dropped |
|---|---|
| What I Can and Want to Do | 习写字 |
| Making Basic Statements | 八半始开点 |
| Talking About the Clock | 生 |
| Days, Months and Years | 吗师老说请问 |
| Introducing Family and Friends | 东买八去市星期点西超 |
| Health and Rest | 们回气热 |
| Talking About People | 年 |
| Counting Real Things | 亮他商她家很漂 |
| Asking and Pointing | 们菜 |
| Buying Everyday Things | 她说问 |
| Learning Chinese | 来 |
