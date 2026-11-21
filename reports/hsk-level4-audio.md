# HSK Level 4 word-audio audit

The owner-supplied `hsk-level-4-audio.zip` carries a manifest bound to `importer/hsk/hsk3_level4_1.0.3.json` (SHA-256 `10a5dcb0…7ee9`), the same Shtooka index and notice preserved for Levels 2–3, and 796 checksum-named MP3s. The manifest is kept byte for byte as [level4-manifest.json](../importer/data/hsk-audio/level4-manifest.json); `scripts/import-hsk-word-audio.py --level 4` re-derives every row's status and source candidates from the preserved index and confirms all 1,000 IDs, headwords and readings match `src/data/vocabulary.json`.

| Coverage | Entries |
| --- | ---: |
| Exact headword and recorded reading | 797 |
| Same headword, different recorded reading | 36 |
| Headword absent from the source | 167 |

Both 生 `shēng` entries (#1646/#1647) share one verified clip. Entries whose exact word and reading already carry the same source's clip on another level reuse that attachment; every other clip was verified (byte count, Git blob, SHA-256) and uploaded once with `lovable-assets`. Upload pointers are kept in [level4-uploads.json](../importer/data/hsk-audio/level4-uploads.json); the attachment counts are in [the machine-readable report](hsk-level4-audio.json). The MP3s stayed outside the repository, and Level 4 example sentences remain without recordings.

Tone marks, tone sandhi spellings and neutral tones must agree; only spacing, case and apostrophes may differ. These same-headword source clips have a different reading and stay unattached:

| HSK ID | Form | Requested reading | Source reading |
| --- | --- | --- | --- |
| 1020 | 背 | bēi | bèi |
| 1021 | 背包 | bēibāo | bèibāo |
| 1043 | 不必 | búbì | bùbì |
| 1045 | 不断 | búduàn | bùduàn |
| 1046 | 不够 | búgòu | bùgòu |
| 1047 | 不过 | búguò | bùguò |
| 1048 | 不论 | búlùn | bùlùn |
| 1086 | 重 | chóng | zhòng |
| 1131 | 待 | dāi | dài |
| 1139 | 倒 | dào | dǎo |
| 1200 | 费用 | fèiyong | fèiyòng |
| 1220 | 干 | gān | gàn |
| 1290 | 好处 | hǎochù | hǎochu |
| 1304 | 坏处 | huàichù | huàichu |
| 1313 | 活泼 | huópō | huópo |
| 1335 | 家具 | jiājù | jiāju |
| 1347 | 价钱 | jiàqián | jiàqian |
| 1427 | 咳 | ké | hāi |
| 1439 | 空 | kòng | kōng |
| 1458 | 老是 | lǎoshì | lǎoshi |
| 1518 | 目的 | mùdì | mùdi |
| 1534 | 嗯 | ǹg | ng |
| 1649 | 生意 | shēngyi | shēngyì |
| 1688 | 熟 | shú/shóu | shú |
| 1689 | 熟悉 | shúxi | shúxī |
| 1691 | 数 | shù | shǔ |
| 1699 | 说法 | shuōfǎ | shuōfa |
| 1717 | 态度 | tàidù | tàidu |
| 1771 | 为 | wéi | wèi |
| 1773 | 味道 | wèidào | wèidao |
| 1832 | 兄弟 | xiōngdì | xiōngdi |
| 1869 | 一生 | yìshēng | yīshēng |
| 1924 | 着 | zháo | zhe |
| 1947 | 值得 | zhídé | zhíde |
| 1959 | 种 | zhòng | zhǒng |
| 1970 | 转 | zhuǎn | zhuàn |

Missing exact headwords: 爱心 (#1003), 安检 (#1004), 本科 (#1024), 毕业生 (#1030), 表格 (#1034), 不便 (#1044), 不光 (#1054), 参赛 (#1063), 查看 (#1067), 查找 (#1069), 厂 (#1072), 车速 (#1075), 车位 (#1076), 乘坐 (#1083), 出行 (#1091), 词语 (#1098), 此次 (#1100), 村 (#1107), 错过 (#1109), 打工 (#1117), 打印 (#1119), 打印机 (#1120), 打折 (#1121), 大巴 (#1123), 大赛 (#1127), 大厅 (#1128), 袋子 (#1133), 登机 (#1146), 低价 (#1150), 低于 (#1152), 底下 (#1154), 点头 (#1158), 电动车 (#1159), 电视剧 (#1160), 动车 (#1166), 堵车 (#1169), 度假 (#1170), 短信 (#1172), 多样 (#1182), 发送 (#1186), 分为 (#1202), 父母 (#1210), 父女 (#1211), 负责人 (#1216), 父子 (#1217), 感人 (#1230), 高价 (#1236), 高于 (#1240), 歌声 (#1242), 各地 (#1245), 各个 (#1246), 各位 (#1247), 购物 (#1262), 管理 (#1273), 果汁 (#1281), 好好 (#1291), 好笑 (#1292), 盒子 (#1294), 红包 (#1295), 互联网 (#1299), 环保 (#1305), 换乘 (#1306), 回复 (#1307), 获奖 (#1317), 基本上 (#1320), 加快 (#1336), 加上 (#1339), 加油站 (#1343), 假日 (#1348), 健身 (#1352), 健身房 (#1353), 降温 (#1366), 交警 (#1369), 叫作 (#1378), 节假日 (#1383), 结账 (#1385), 景点 (#1401), 景区 (#1402), 举例 (#1411), 聚餐 (#1414), 考生 (#1423), 快递 (#1443), 零下 (#1476), 零花钱 (#1477), 零食 (#1479), 留下 (#1485), 毛衣 (#1498), 美景 (#1502), 美食 (#1504), 密码 (#1507), 面试 (#1510), 母女 (#1514), 母子 (#1516), 目的地 (#1519), 男士 (#1524), 难忘 (#1526), 能否 (#1531), 年底 (#1535), 皮鞋 (#1553), 葡萄酒 (#1560), 期末 (#1565), 期中 (#1566), 起到 (#1569), 巧克力 (#1583), 全球 (#1601), 全身 (#1602), 人数 (#1611), 入住 (#1625), 扫码 (#1627), 上门 (#1632), 少见 (#1635), 摄氏度 (#1640), 身份证 (#1643), 师生 (#1655), 时间表 (#1659), 实际上 (#1660), 十字路口 (#1665), 使 (#1666), 使馆 (#1667), 视频 (#1673), 市区 (#1674), 试题 (#1675), 收费 (#1677), 收听 (#1680), 受不了 (#1684), 售票员 (#1685), 说明书 (#1701), 硕士 (#1702), 酸奶 (#1707), 抬头 (#1716), 提出 (#1727), 提到 (#1728), 体检 (#1732), 听力 (#1737), 停车 (#1740), 停车场 (#1741), 头痛 (#1751), 推出 (#1757), 外套 (#1761), 晚安 (#1763), 网购 (#1765), 网页 (#1767), 网友 (#1768), 网址 (#1769), 午餐 (#1785), 线上 (#1799), 线下 (#1800), 现有 (#1801), 小吃 (#1812), 亚洲 (#1842), 应聘 (#1876), 用来 (#1879), 用于 (#1880), 游玩 (#1887), 有着 (#1894), 远离 (#1903), 月饼 (#1908), 再次 (#1914), 暂停 (#1917), 早餐 (#1918), 着火 (#1925), 之间 (#1942), 纸巾 (#1954), 转发 (#1971), 转机 (#1972), 自习 (#1982), 最终 (#1988).

Recordings: Yue Tan / Shtooka `cmn-caen-tan`, © 2009, CC BY-SA 3.0 US, from [audio-cmn commit f759a0f18f27690742957619e1248ed91e9b3f2c](https://github.com/hugolpz/audio-cmn/tree/f759a0f18f27690742957619e1248ed91e9b3f2c) `64k/hsk`. This validates recorded text/reading identity and bytes; it is not an independent listening certification.
