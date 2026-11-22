# Editorial QA — Conversational Mandarin

Reviewed source: 16 transcripts and HTML extraction. The 880 extracted rows are all character-aligned to timed transcript lines. Alignment does not certify translations.

## Source status breakdown

- curated_teaching_entry: 215
- drill_fragment: 26
- exclude_malformed: 37
- transcript_attested_extracted: 222
- transcript_attested_unreviewed_gloss: 380

## Validity policy

- **Curated**: exact Hanzi rows matching one of the manually reviewed topic expressions, with corrected pinyin and English.
- **Transcript attested / unreviewed gloss**: Mandarin occurs in the transcript, but first-pass translation is a machine-compositional or provisional gloss. Not presumed incorrect.
- **Drill fragment**: a component for pronunciation or repetition, not necessarily an independent word.
- **Excluded malformed**: clear false lexical boundaries, absent numerals, or merged utterances. These remain in the audit index for accountability.

## Selected corrections

- 不起 (bù qǐ) was separated from 对不起 (duìbuqǐ); retain it as a reverse-build drill, not a standalone apology.
- 钟吃 (zhōng chī) is not a word: 钟 (zhōng) attaches to clock time such as 四点钟 (sì diǎn zhōng).
- 什么吗 (shénme ma) is not an appropriate complete question in this context; use 你说什么？(nǐ shuō shénme?) or a yes–no question with 吗 (ma), not both together.
- 我会说我 (wǒ huì shuō wǒ) appears as a bad segmentation/merge, not as a useful standalone sentence.
- 一会儿 (yíhuìr) is given natural erhua and 一 tone sandhi in the curated material; 这儿 (zhèr), 那儿 (nàr), 哪儿 (nǎr) are similarly normalized.
- 不会 (bú huì), 不在 (bú zài), 不要 (bú yào) account for 不 sandhi before fourth tone; 不想 (bù xiǎng) retains the fourth tone.
- 还是 (háishi) is used for an either/or question, and 或者 (huòzhě) for a statement offering alternatives.
- 多少钱 (duōshao qián) is a price question; raw `给我块人民币` is incomplete without a numeral.
- 对不起 (duìbuqǐ) / 请问 (qǐngwèn) are distinguished as apology/attention-getter versus polite preface to a question.

## Limits

Curated lessons have been editorially reviewed for introductory Mandarin. The original long-tail extraction is not yet exhaustively native-speaker verified; use its status fields when importing.
