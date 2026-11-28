# External pronunciation cross-check

Reviewed 2026-11-28 against primary dictionary, ministry and college teaching sources. This complements the [offline recording metadata audit](pronunciation-recording-audit.md), without changing application data.

All 11 vocabulary IDs are reviewed below. Four need priority checks of the actual clip, four have attested full/neutral pronunciation alternatives, two are explained by tone sandhi, and one concerns alternate-reading audio coverage. These are linguistic assessments, not listening verification.

| HSK ID | Form | App display | Recording-source label | Assessment |
| --- | --- | --- | --- | --- |
| 58 | 歌 | gē | gēge | Priority clip review |
| 67 | 还 | hái | huàn | Priority clip review |
| 131 | 哪 | nǎ | na | Priority clip review |
| 139 | 那里 | nàlǐ | nàli | Attested variants |
| 181 | 谁 | shéi / shuí | sheí | Alternate-reading coverage |
| 213 | 外边 | wàibian | wàibiān | Attested variants |
| 248 | 学生 | xuéshēng | xuésheng | Attested variants |
| 258 | 一半 | yíbàn | yībàn | Expected tone sandhi |
| 259 | 一下 | yíxià | yīxià | Expected tone sandhi |
| 282 | 这里 | zhèlǐ | zhèli | Attested variants |
| 287 | 只 | zhī | zhǐ | Priority clip review |

## Priority clip checks

- **歌: gē.** The displayed reading is dictionary-supported. gēge is not the dictionary reading of the single song entry; this can be an index typo or a wrong/multi-syllable clip. Listen before deciding. [Taiwan MOE Revised Mandarin Dictionary: 歌](https://dict.revised.moe.edu.tw/dictView.jsp?ID=3940&la=0&powerMode=0).
- **还: hái for still/also; huán for return.** The displayed hái fits this adverb entry. The source huàn label does not fit that sense; do not change the word to match this label. [Taiwan MOE character learning dictionary: 還](https://stroke-order.learningweb.moe.edu.tw/dictMean.jsp?ID=36996).
- **哪: nǎ for which; na for the particle.** This is a meaning-dependent reading distinction, not a harmless neutral-tone substitution for the interrogative entry. [Taiwan MOE character learning dictionary: 哪](https://stroke-order.learningweb.moe.edu.tw/dictMean.jsp?ID=21738&la=0).
- **只: zhī for classifier; zhǐ for only.** The entry is tagged classifier, so zhī fits. The source label zhǐ belongs to only. The current meanings also include only under zhī; that sense needs separate correction/review. [Taiwan MOE Mini Dictionary: 隻](https://dict.mini.moe.edu.tw/SearchIndex/word_detail?wordID=D0001146), [Taiwan MOE Mini Dictionary: 只](https://dict.mini.moe.edu.tw/SearchIndex/word_detail?wordID=D0002782).

These dictionary distinctions validate the intended reading/sense, not the contents of a CDN clip. Listen before deciding whether the wrong element is the source label, attached file or displayed reading. In particular, keep the classifier reading of 只 separate from its “only” sense.

## Attested variation and tone sandhi

- **那里: nàli / nàlǐ.** Both neutral and full-tone forms are attested. Label and bind whichever reading the clip actually uses. [PRC Ministry of Education GF 0015-2010 vocabulary table](https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201010/W020220124393643101738.pdf), [Taiwan MOE Revised Mandarin Dictionary: 那裡](https://dict.revised.moe.edu.tw/dictView.jsp?ID=56269&la=0&powerMode=0).
- **谁: shéi / shuí.** Both readings are valid. The source spelling sheí represents the same second-tone syllable as shéi with noncanonical mark placement. It does not document shuí coverage. [Taiwan MOE Revised Mandarin Dictionary: 誰](https://dict.revised.moe.edu.tw/dictView.jsp?ID=8878&la=0&powerMode=0).
- **外边: wàibian / wàibiān.** Both forms are attested. This requires variant-specific audio/display consistency, not automatic rejection as incorrect Mandarin. [PRC Ministry of Education GF 0025-2021 vocabulary table](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/W020210329527301787356.pdf), [Taiwan MOE Revised Mandarin Dictionary: 外邊](https://dict.revised.moe.edu.tw/dictView.jsp?ID=160380&la=0&powerMode=0).
- **学生: xuésheng / xuéshēng.** Neutral-tone sheng is supported by Mainland teaching guidance; full-tone shēng is recorded by Taiwan MOE. Label the reading actually heard. [Sichuan College of Science and Technology: Mandarin test pronunciation guidance](https://www.scst.edu.cn/yywz/50/8d/c1942a20621/page.htm), [Taiwan MOE Concise Mandarin Dictionary: 學生](https://dict.concised.moe.edu.tw/dictView.jsp?ID=28513).
- **一半: citation yībàn; spoken yíbàn.** Applying the documented rule to fourth-tone bàn gives second-tone yí. A citation-tone source label alone is not a recording error. [Shanxi Finance and Taxation College: 一 and 不 tone sandhi](https://www.sxftc.edu.cn/cjc/info/1228/2997.htm).
- **一下: citation yīxià; spoken yíxià.** Applying the documented rule to fourth-tone xià gives second-tone yí. Keep citation and spoken notation distinct. [Shanxi Finance and Taxation College: 一 and 不 tone sandhi](https://www.sxftc.edu.cn/cjc/info/1228/2997.htm).
- **这里: zhèli / zhèlǐ.** Both forms are attested. Check the actual clip and intended pronunciation convention before changing either. [PRC Ministry of Education GF 0015-2010 vocabulary table](https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/201010/W020220124393643101738.pdf), [Taiwan MOE Revised Mandarin Dictionary: 這裡](https://dict.revised.moe.edu.tw/dictView.jsp?ID=115043&la=0&powerMode=0).

The Mainland and Taiwan sources attest different pronunciation conventions for some words. This explains a discrepancy without proving that the app's displayed reading matches the actual clip. Keep exact tone-specific attachment labels or explicit variant/citation/spoken annotations; do not silently relabel recordings.

## Evidence and limits

The [structured review](pronunciation-recording-external-review.json) retains each exact vocabulary ID, source-index reading, disposition and supporting URLs, bound to the input audit's SHA-256. Ministry PDF table claims here came from indexed primary-source extracts; the complete 2010 PDF was not inspected. The 2021 PDF was downloaded temporarily but was not used for a full-page visual review.

No clip was independently listened to or transcribed. No runtime readings, meanings, IDs, audio URLs, source tuples or imported data were changed by this external review.
