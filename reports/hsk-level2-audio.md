# HSK Level 2 word-audio audit

Pulled the repository before work (`056beecc`). The Level 2 handoff's 200 record identities/readings match the runtime vocabulary exactly. Source metadata and recordings are pinned in [the importer source guide](../importer/data/hsk-audio/README.md).

| Coverage | Entries |
| --- | ---: |
| Exact headword and recorded reading | 166 |
| Same headword, different recorded reading | 13 |
| Headword absent from the source | 21 |
| Exact existing CDN attachment reused (点, #336) | 1 |
| Eligible entries awaiting CDN upload/attachment | 165 |

**Current handoff state:** 165 unique MP3s have been downloaded, verified against pinned audio-cmn Git blob IDs, checked with SHA-256, and staged under [importer/data/hsk-audio/recordings/](../importer/data/hsk-audio/recordings/README.md), as explicitly requested by the owner for Lovable. No new CDN uploads have occurred. One staged clip already exists as 点's Level 1 attachment, and the two 花 entries share one clip, leaving 164 unique uploads for 165 pending entries. Only 点's exact existing attachment has been added to runtime Level 2 data. Follow [LOVABLE_HANDOFF.md](../importer/data/hsk-audio/LOVABLE_HANDOFF.md) to complete uploading and attach returned URLs.

The recordings are from [audio-cmn, commit f759a0f18f27690742957619e1248ed91e9b3f2c](https://github.com/hugolpz/audio-cmn/tree/f759a0f18f27690742957619e1248ed91e9b3f2c), `64k/hsk`. Matching uses the original Shtooka `cmn-caen-tan` text/reading index, preserved byte for byte from [the Yojik mirror](https://fsi-languages.yojik.eu/audiocollections/detailled/cmn-caen-tan/mp3/index.xml). The original source notice records © 2009 Yue Tan, CC BY-SA 3.0 US. This validates recorded text/reading identity and bytes; it is not an independent listening certification.

Whitespace, case and pinyin boundary apostrophes may differ; tone marks and neutral tones must agree. No script substitutions, concatenated syllables, guessed readings or sentence audio are introduced. Source filenames alone would have offered 179 matches, including the following incompatible readings, which stay unattached:

| HSK ID | Form | Requested reading | Source reading |
| --- | --- | --- | --- |
| 301 | 啊 | a | ā |
| 314 | 长 | cháng | zhǎng |
| 332 | 得 | de | děi |
| 333 | 地 | de | dì |
| 351 | 过 | guo | guò |
| 352 | 还是 | háishi | háishì |
| 356 | 后面 | hòumiàn | hòumian |
| 419 | 前面 | qiánmiàn | qiánmian |
| 426 | 上面 | shàngmiàn | shàngmian |
| 430 | 生日 | shēngrì | shēngri |
| 447 | 外面 | wàimiàn | wàimian |
| 459 | 下面 | xiàmiàn | xiàmian |
| 472 | 已经 | yǐjīng | yǐjing |

Missing exact headwords: 白色 (#303), 出国 (#317), 打车 (#328), 打开 (#329), 公交车 (#346), 黑色 (#353), 红色 (#355), 机票 (#364), 快要 (#386), 绿茶 (#395), 绿色 (#396), 门票 (#402), 奶茶 (#408), 男孩儿 (#410), 女孩儿 (#412), 上网 (#428), 网上 (#451), 洗手间 (#457), 小时候 (#462), 药店 (#469), 走路 (#496).

The source has a `guò` recording for 过 (#347), which is eligible; neutral `guo` (#351) is distinct. Both 花 entries (#357/#358) record `huā` and share the same verified word clip without merging their vocabulary identities. All 400 Level 2 examples and every Level 1 record/attachment remain unchanged. The only initial runtime changes are 点's `audio` and modification timestamp; repeat imports are idempotent.
