# HSK Level 5 word-audio audit

The owner-supplied `hsk-level-5-audio.zip` (SHA-256 `5d433274…20e9e`, 13,234,156 bytes, as recorded in [the package report](hsk-level5-audio-package.json)) carries the manifest kept as [level5-manifest.json](../importer/data/hsk-audio/level5-manifest.json), the same Shtooka index and notice preserved for Levels 2–4, and 1,304 checksum-named MP3s. `scripts/import-hsk-word-audio.py --level 5` verified every MP3 (byte count, Git blob, SHA-256), re-derived every row from the preserved index and confirmed all 1,600 IDs, headwords and readings against the current v1.0.1 vocabulary through the manifest's checksum-bound `compatibleHandoffs`.

| Coverage | Entries |
| --- | ---: |
| Exact headword and recorded reading (attached) | 1,306 |
| Same headword, different recorded reading | 42 |
| Headword absent from the source | 252 |

1,298 clips were uploaded once each with `lovable-assets`; six entries reuse the same source's existing clip for the exact word and reading from an earlier level. Upload pointers are kept in [level5-uploads.json](../importer/data/hsk-audio/level5-uploads.json); attachment counts are in [the machine-readable report](hsk-level5-audio.json) (`attached: 1306`, no pending uploads; a repeat import reports `changed: 0`). Only `audio` and `updatedAt` changed on Level 5 records. The MP3s and ZIP stayed outside the repository. Level 5 example sentences are drafts and remain without recordings; rewritten sentences never inherit word recordings.

Tone marks, tone sandhi spellings and neutral tones must agree; only spacing, case and apostrophes may differ. These same-headword source clips have a different reading and stay unattached:

| HSK ID | Form | Requested reading | Source reading |
| --- | --- | --- | --- |
| 2003 | 唉 | ài | āi |
| 2073 | 不利 | búlì | bùlì |
| 2074 | 不幸 | búxìng | bùxìng |
| 2075 | 不要紧 | búyàojǐn | bùyàojǐn |
| 2108 | 长处 | chángchù | chángchu |
| 2179 | 处 | chǔ | chù |
| 2245 | 当地 | dāngdì | dāngdi |
| 2250 | 当 | dàng | dāng |
| 2301 | 短处 | duǎnchù | duǎnchu |
| 2386 | 高大 | gāodà | gāodù |
| 2388 | 高度 | gāodù | gāndù |
| 2399 | 各行各业 | gèháng-gèyè | gèhánggèyè |
| 2467 | 行 | háng | xíng |
| 2472 | 好 | hào | hǎo |
| 2479 | 合同 | hétóng | hétong |
| 2496 | 划 | huá | huà |
| 2505 | 黄瓜 | huángguā | huánggua |
| 2539 | 系 | jì | xì |
| 2610 | 尽量 | jǐnliàng | jìnliàng |
| 2620 | 进一步 | jìnyíbù | jìnyībù |
| 2623 | 精神 | jīngshen | jīngshén |
| 2657 | 看 | kān | kàn |
| 2674 | 口袋 | kǒudai | kǒudài |
| 2707 | 力量 | lìliàng | lìliang |
| 2719 | 量 | liàng | liáng |
| 2747 | 逻辑 | luójí | luóji |
| 2749 | 买卖 | mǎimai | mǎimài |
| 2753 | 毛病 | máobìng | máobing |
| 2768 | 面积 | miànjī | miànji |
| 2982 | 身份 | shēnfèn | shēnfen |
| 3130 | 调 | tiáo | diào |
| 3149 | 头 | tou | tóu |
| 3184 | 为 | wéi | wèi |
| 3198 | 位置 | wèizhì | wèizhi |
| 3254 | 响声 | xiǎngshēng | xiǎngsheng |
| 3269 | 小姐 | xiǎojiě | xiǎojie |
| 3339 | 要不是 | yàobúshì | yàobushì |
| 3354 | 一旦 | yídàn | yīdàn |
| 3358 | 一路顺风 | yílù-shùnfēng | yīlùshùnfēng |
| 3360 | 一致 | yízhì | yīzhì |
| 3366 | 意识 | yìshí | yìshi |
| 3460 | 炸 | zhá | zhà |

Missing exact headwords: 安全带 (#2006), 熬夜 (#2010), 保安 (#2022), 保质期 (#2029), 报警 (#2033), 本地 (#2041), 便利店 (#2059), 拨打 (#2070), 不符 (#2078), 餐饮 (#2090), 超速 (#2120), 车祸 (#2124), 车库 (#2125), 车主 (#2128), 称为 (#2134), 成年 (#2143), 城区 (#2144), 橙子 (#2153), 充电 (#2159), 充值 (#2162), 宠物 (#2166), 出自 (#2177), 此前 (#2197), 从不 (#2200), 促销 (#2206), 打包 (#2214), 打断 (#2215), 大妈 (#2222), 大事 (#2227), 大象 (#2228), 大爷 (#2230), 单一 (#2241), 胆小 (#2243), 当成 (#2251), 当作 (#2252), 灯光 (#2260), 登录 (#2262), 低头 (#2266), 点赞 (#2277), 电动 (#2279), 电商 (#2281), 电子版 (#2283), 调研 (#2285), 动画 (#2290), 读音 (#2297), 二手 (#2314), 二维码 (#2315), 发音 (#2323), 飞行员 (#2346), 非洲 (#2347), 分手 (#2354), 分享 (#2356), 丰富多彩 (#2358), 改天 (#2379), 刚好 (#2385), 高科技 (#2390), 高效 (#2391), 歌词 (#2394), 公务员 (#2413), 恭喜 (#2414), 工艺 (#2416), 公寓 (#2417), 共享 (#2419), 国画 (#2450), 国庆 (#2451), 过敏 (#2456), 过期 (#2457), 哈 (#2459), 海鲜 (#2462), 汗水 (#2466), 好评 (#2469), 好运 (#2470), 盒饭 (#2476), 合影 (#2480), 互动 (#2492), 户外 (#2493), 话费 (#2498), 缓解 (#2503), 灰色 (#2510), 婚礼 (#2513), 火锅 (#2516), 机器人 (#2523), 及 (#2525), 急诊 (#2536), 纪录 (#2542), 纪录片 (#2543), 纪念日 (#2546), 嘉宾 (#2551), 家电 (#2552), 驾照 (#2562), 减肥 (#2569), 简历 (#2570), 键 (#2573), 降水 (#2586), 近年来 (#2617), 近日 (#2619), 惊喜 (#2624), 酒吧 (#2627), 久远 (#2628), 救护车 (#2630), 角色 (#2647), 开幕式 (#2652), 开通 (#2654), 开业 (#2655), 客服 (#2668), 客户 (#2670), 口味 (#2675), 宽度 (#2678), 老公 (#2686), 姥爷 (#2689), 泪 (#2692), 泪水 (#2694), 离职 (#2700), 领带 (#2726), 领取 (#2728), 流感 (#2733), 浏览 (#2734), 留言 (#2735), 路人 (#2741), 旅行社 (#2745), 没法儿 (#2755), 媒体 (#2757), 美味 (#2759), 魅力 (#2760), 迷路 (#2763), 面向 (#2770), 名片 (#2775), 闹钟 (#2794), 年初 (#2797), 年夜饭 (#2800), 牛仔裤 (#2802), 欧洲 (#2808), 陪伴 (#2816), 配送 (#2821), 拼音 (#2831), 品牌 (#2833), 凭借 (#2843), 屏幕 (#2846), 平台 (#2847), 签 (#2859), 前来 (#2864), 亲朋好友 (#2880), 亲情 (#2882), 轻重 (#2888), 全新 (#2903), 人际 (#2919), 日历 (#2930), 赛场 (#2942), 扇 (#2949), 删除 (#2950), 商家 (#2958), 商务 (#2960), 上传 (#2963), 烧烤 (#2968), 社区 (#2975), 升级 (#2993), 升温 (#2994), 生肖 (#2996), 省份 (#2999), 失恋 (#3005), 时差 (#3010), 实验 (#3022), 实验室 (#3023), 视为 (#3036), 适用 (#3042), 收看 (#3045), 首次 (#3047), 售价 (#3054), 书房 (#3057), 熟人 (#3062), 鼠标 (#3064), 酸甜苦辣 (#3087), 台灯 (#3101), 特有 (#3110), 疼痛 (#3112), 提起 (#3116), 甜品 (#3127), 图书 (#3152), 团队 (#3157), 拖鞋 (#3166), 外公 (#3168), 完美 (#3174), 网络 (#3179), 唯一 (#3191), 问卷 (#3202), 无关 (#3206), 无奈 (#3207), 五颜六色 (#3214), 物业 (#3219), 吸管 (#3222), 西装 (#3224), 下载 (#3230), 相处 (#3247), 相册 (#3257), 向上 (#3260), 消费者 (#3263), 销量 (#3266), 小于 (#3271), 心态 (#3281), 行走 (#3297), 休闲 (#3302), 学分 (#3309), 雪糕 (#3315), 押金 (#3321), 压岁钱 (#3322), 研发 (#3327), 阳台 (#3333), 样式 (#3334), 夜市 (#3343), 一次性 (#3352), 一代 (#3353), 一路 (#3357), 音量 (#3372), 影视 (#3383), 应对 (#3385), 由此 (#3402), 油条 (#3407), 有助于 (#3414), 原有 (#3430), 员工 (#3432), 约定 (#3436), 运费 (#3438), 在场 (#3442), 在内 (#3444), 在线 (#3445), 造成 (#3454), 赠 (#3458), 展示 (#3466), 站台 (#3469), 占线 (#3470), 账号 (#3475), 账户 (#3476), 折扣 (#3479), 正如 (#3496), 知名 (#3500), 职场 (#3503), 志愿者 (#3517), 中华 (#3520), 中华民族 (#3521), 中级 (#3522), 中介 (#3523), 中期 (#3524), 中外 (#3525), 住宿 (#3551), 住址 (#3552), 装修 (#3561), 子女 (#3573), 总部 (#3581), 总体 (#3584), 足够 (#3589), 最佳 (#3597), 作出 (#3600).

Recordings: Yue Tan / Shtooka `cmn-caen-tan`, © 2009, CC BY-SA 3.0 US, from [audio-cmn commit f759a0f18f27690742957619e1248ed91e9b3f2c](https://github.com/hugolpz/audio-cmn/tree/f759a0f18f27690742957619e1248ed91e9b3f2c) `64k/hsk`. This validates recorded text/reading identity and bytes; it is not an independent listening certification.
