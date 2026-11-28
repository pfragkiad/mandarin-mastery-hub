# HSK Levels 1–5 Official ID Cross-Check

Cross-checked all 3,600 entries across Levels 1–5 (IDs `1–3600`) in both the raw handoffs (`importer/hsk/`) and runtime vocabulary (`src/data/vocabulary/`) against the active official syllabus PDF linked from `chinesetest.cn` (`Test Syllabus` / `HSK3.0考试大纲.pdf`).

## Official Source Verified

- **Site:** `https://www.chinesetest.cn/` (`Test Syllabus` link)
- **PDF URL:** `https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf`
- **HTTP `Last-Modified`:** `Fri, 30 Oct 2026 08:04:38 GMT` (`4,943,759` bytes)
- **PDF Metadata:** `title="HSK（1-9级）词汇大纲.xlsx"`, `creationDate="D:20251217135342+08'00'"`, `modDate="D:20261030123002+08'00'"`
- **PDF SHA-256:** `d8b6646599bc9a0c9616a4cb06d4b37461f8792f70a3171016d00fcd8eda09ad`

No runtime vocabulary or handoff files were modified by this audit. Runtime `src/data/vocabulary/level-{1..5}.json` matches the `importer/hsk/` handoffs with `0` ID/headword/pinyin diffs across all `3,600` entries.

## Summary by Level

| Level | Range | Entries | Exact ID Matches | ID Mismatches | Headword+Pinyin Set Diffs | Pinyin Diffs | Homograph Tag Diffs | POS Diffs |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1–300 | 300 | 265 | 35 | 0 (exact bijection) | 3 | 0 | 0 |
| 2 | 301–500 | 200 | 185 | 15 | 0 (exact bijection) | 0 | 0 | 0 |
| 3 | 501–1000 | 500 | 392 | 108 | 0 (exact bijection) | 0 | 0 | 5 |
| 4 | 1001–2000 | 1000 | 683 | 317 | 0 (exact bijection) | 0 | 2 | 0 |
| 5 | 2001–3600 | 1600 | 983 | 617 | 0 (exact bijection) | 0 | 0 | 1 |
| **Total** | **1–3600** | **3600** | **2508** | **1092** | **0** | **3** | **2** | **6** |

## Non-ID Field Differences

### Level 1 Pinyin Differences (`3`)
- ID `153` `女儿`: official `nǚ’ér` vs repo `nǚ'ér` (apostrophe style)
- ID `181` `谁`: official `shéi/shuí` vs repo `shéi / shuí` (slash spacing)
- ID `235` `小朋友`: official `xiǎopéngyǒu` vs repo `xiǎopéngyou` (final syllable tone vs neutral tone)

### Level 3 `syllabus_pos_zh` Differences (`5`)
All five correspond to a POS column shift in `hsk3_level3_1.1.2.json` and `src/data/vocabulary/level-3.json` (`studyMetadata.syllabusPosZh`):
- ID `678` `还`: official `动` vs repo `名`
- ID `679` `环境`: official `名` vs repo `动`
- ID `680` `换`: official `动` vs repo `名`
- ID `681` `黄色`: official `名` vs repo `动`
- ID `682` `回答`: official `动` vs repo `名`

### Level 4 Homograph Tag Differences (`2`)
- `乘` (`chéng`): official ID `1077` `乘1` vs repo ID `1078` `乘`
- `等` (`děng`): official ID `1149` `等2` vs repo ID `1147` `等`

### Level 5 `syllabus_pos_zh` Differences (`1`)
- ID `2012` `白`: official `副` vs repo `形、副`

## ID Mismatches by Level (`repoId -> officialId`)

Full machine-readable list for all 1,092 shifted IDs is in [hsk-level1-5-official-id-crosscheck.json](hsk-level1-5-official-id-crosscheck.json).

### Level 1 (35 shifted IDs)

| Headword | Pinyin | Repo ID | Official ID |
| --- | --- | ---: | ---: |
| 弟弟 | dìdi | 32 | 31 |
| 第 | dì | 31 | 32 |
| 电话 | diànhuà | 35 | 34 |
| 电脑 | diànnǎo | 36 | 35 |
| 电视 | diànshì | 37 | 36 |
| 电影 | diànyǐng | 38 | 37 |
| 电影院 | diànyǐngyuàn | 39 | 38 |
| 店 | diàn | 34 | 39 |
| 飞机 | fēijī | 54 | 53 |
| 非常 | fēicháng | 53 | 54 |
| 哥哥 | gēge | 59 | 58 |
| 歌 | gē | 58 | 59 |
| 工作 | gōngzuò | 63 | 62 |
| 公司 | gōngsī | 62 | 63 |
| 名字 | míngzi | 130 | 128 |
| 明年 | míngnián | 128 | 129 |
| 明天 | míngtiān | 129 | 130 |
| 他们 | tāmen | 203 | 201 |
| 它 | tā | 201 | 202 |
| 它们 | tāmen | 204 | 203 |
| 她 | tā | 202 | 204 |
| 下班 | xiàbān | 228 | 227 |
| 下课 | xiàkè | 229 | 228 |
| 下午 | xiàwǔ | 230 | 229 |
| 下雨 | xià yǔ | 227 | 230 |
| 一半 | yíbàn | 258 | 255 |
| 一点儿 | yìdiǎnr | 261 | 256 |
| 一下 | yíxià | 259 | 257 |
| 一些 | yìxiē | 262 | 258 |
| 衣服 | yīfu | 255 | 259 |
| 医生 | yīshēng | 256 | 260 |
| 医院 | yīyuàn | 257 | 261 |
| 椅子 | yǐzi | 260 | 262 |
| 再见 | zàijiàn | 272 | 271 |
| 在 | zài | 271 | 272 |

### Level 2 (15 shifted IDs)

| Headword | Pinyin | Repo ID | Official ID |
| --- | --- | ---: | ---: |
| 地 | de | 333 | 332 |
| 得 | de | 332 | 333 |
| 进来 | jìnlái | 372 | 371 |
| 进去 | jìnqù | 373 | 372 |
| 近 | jìn | 371 | 373 |
| 网上 | wǎngshang | 451 | 450 |
| 往 | wǎng | 450 | 451 |
| 为什么 | wèi shénme | 454 | 453 |
| 位 | wèi | 453 | 454 |
| 一起 | yìqǐ | 473 | 472 |
| 已经 | yǐjīng | 472 | 473 |
| 因为 | yīnwèi | 476 | 475 |
| 阴 | yīn | 475 | 476 |
| 有时 | yǒushí | 480 | 479 |
| 有意思 | yǒu yìsi | 479 | 480 |

### Level 3 (108 shifted IDs)

108 entries shifted within Level 3 due to updated Excel `拼音` sort order; first 12 by official ID: 班级 (`508→507`), 搬 (`507→508`), 比较 (`521→520`), 比如 (`523→521`), 比赛 (`524→522`), 笔记 (`520→523`), 笔记本 (`522→524`), 变成 (`528→527`), 变化 (`529→528`), 遍 (`527→529`), 不久 (`542→540`), 不行 (`543→542`). See [the JSON audit](hsk-level1-5-official-id-crosscheck.json) for all 108 pairs.

### Level 4 (317 shifted IDs)

317 entries shifted within Level 4 due to updated Excel `拼音` sort order; first 12 by official ID: 报考 (`1017→1016`), 报名 (`1018→1017`), 抱 (`1016→1018`), 不得不 (`1051→1045`), 不断 (`1045→1046`), 不够 (`1046→1047`), 不管 (`1053→1048`), 不光 (`1054→1049`), 不过 (`1047→1050`), 不仅 (`1055→1051`), 不论 (`1048→1052`), 不满 (`1056→1053`). See [the JSON audit](hsk-level1-5-official-id-crosscheck.json) for all 317 pairs.

### Level 5 (617 shifted IDs)

617 entries shifted within Level 5 due to updated Excel `拼音` sort order; first 12 by official ID: 宝贝 (`2023→2021`), 宝贵 (`2026→2022`), 保 (`2021→2023`), 保安 (`2022→2024`), 保持 (`2024→2025`), 保存 (`2025→2026`), 抱怨 (`2035→2034`), 暴雨 (`2034→2035`), 比分 (`2046→2045`), 比例 (`2047→2046`), 比喻 (`2048→2047`), 彼此 (`2045→2048`). See [the JSON audit](hsk-level1-5-official-id-crosscheck.json) for all 617 pairs.
