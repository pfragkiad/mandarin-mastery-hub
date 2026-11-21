# HSK Level 3 word-audio audit

The owner-supplied `hsk-level-3-audio.zip` carries a manifest bound to `importer/hsk/hsk3_level3_1.0.4.json` (SHA-256 `119cc398…dd5d`), the same Shtooka index and notice already preserved for Level 2, and 443 checksum-named MP3s. The manifest is kept byte for byte as [level3-manifest.json](../importer/data/hsk-audio/level3-manifest.json); `scripts/import-hsk-word-audio.py --level 3` re-derives every row's status and source candidates from the preserved index and confirms all 500 IDs, headwords and readings match `src/data/vocabulary.json`.

| Coverage | Entries |
| --- | ---: |
| Exact headword and recorded reading | 443 |
| Same headword, different recorded reading | 12 |
| Headword absent from the source | 45 |
| Exact earlier-level CDN clip reused (过去 #660, 会 #683, 站 #966) | 3 |
| New CDN uploads attached (one per unique clip) | 440 |

**Upload state:** every package MP3 was verified (byte count, Git blob, SHA-256) before upload, each pending clip was uploaded once with `lovable-assets`, and all 443 matched entries are attached with their CDN URL, source, license and `recordingKind: word` ([machine-readable report](hsk-level3-audio.json)). A repeat import reports `changed: 0`. Every attached URL was fetched back and matched its SHA-256. The temporary MP3s stayed outside the repository. All Level 3 example sentences remain without recordings.

Tone marks and neutral tones must agree; only spacing, case and apostrophes may differ. These same-headword source clips have a different reading and stay unattached:

| HSK ID | Form | Requested reading | Source reading |
| --- | --- | --- | --- |
| 532 | 别人 | biérén | biéren |
| 539 | 不见 | bújiàn | bùjiàn |
| 559 | 成绩 | chéngjì | chéngjī |
| 570 | 聪明 | cōngmíng | cōngming |
| 583 | 得 | dé | děi |
| 654 | 关系 | guānxì | guānxi |
| 678 | 还 | huán | huàn |
| 730 | 看来 | kànlái | kànlai |
| 737 | 客人 | kèrén | kèren |
| 902 | 心里 | xīnlǐ | xīnli |
| 933 | 一边 | yìbiān | yībiān |
| 992 | 子 | zi | zǐ |

Missing exact headwords: 班级 (#508), 搬家 (#509), 笔记本 (#522), 冰激凌 (#535), 冰箱 (#536), 除了 (#566), 大熊猫 (#576), 得分 (#585), 的话 (#586), 电子书 (#595), 短裤 (#606), 耳机 (#613), 方便面 (#620), 分开 (#628), 高铁 (#644), 工作日 (#649), 关机 (#653), 关注 (#657), 过节 (#659), 红绿灯 (#670), 检票 (#700), 姐妹 (#714), 开花 (#726), 开机 (#728), 矿泉水 (#742), 聊天儿 (#756), 路边 (#762), 男生 (#780), 难听 (#782), 女生 (#788), 身高 (#827), 收到 (#837), 受到 (#840), 外卖 (#866), 晚点 (#870), 网站 (#873), 卫生间 (#877), 相机 (#896), 小区 (#897), 信用卡 (#907), 休假 (#911), 银行卡 (#937), 邮件 (#942), 邮箱 (#945), 怎么办 (#964).

Recordings: Yue Tan / Shtooka `cmn-caen-tan`, © 2009, CC BY-SA 3.0 US, from [audio-cmn commit f759a0f18f27690742957619e1248ed91e9b3f2c](https://github.com/hugolpz/audio-cmn/tree/f759a0f18f27690742957619e1248ed91e9b3f2c) `64k/hsk`. This validates recorded text/reading identity and bytes; it is not an independent listening certification.
