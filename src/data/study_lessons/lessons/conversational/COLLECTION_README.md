# Core v3.6.0 · Conversational Mandarin and independent lessons

This package includes 17 validated Conversational Mandarin lessons with 43 three-line patterns, plus the two updated independent character lessons with 11 three-line constructions. The conversational content and course coverage v1.1.5 are carried forward from Core v3.5.0.

## Earlier release notes

# Grammar pattern display update · Core v3.5.0

All 43 grammar patterns across 17 conversational lessons include the approved pseudo-translation below the pinyin. JSON uses the optional `pattern_pseudo_translation` field under general lesson format v3.4.0. The lesson HTML, Markdown, and offline browser show the third line. Expression coverage remains v1.1.5.

App integration: show the optional value below `pattern_pinyin`. Parse angle-bracket slots as text, style the fixed Mandarin in bold, and keep the line out of audio. Render legacy lessons without the third line when the field is absent.

## Earlier release notes

# Conversational Mandarin — Conversational Coverage Edition

17 topic lessons based on everyday communication goals, with expanded dialogues, grammar, reviewed expressions, and practice. Existing progress IDs are retained. Added supplementary checkpoints in the original lessons are optional to protect completed progress.

Current release: Core v3.4.0, taxonomy v2.0.0, coverage v1.1.5. Historical earlier audit details are retained below.

## Pronunciation / regional variants

Pronunciation: This course often uses northern-influenced 儿化 (érhuà), especially 一点儿 (yìdiǎnr), 哪儿 (nǎr), 这儿 (zhèr), 那儿 (nàr) and 一会儿 (yíhuìr). A small Northern-style -r marker identifies affected expressions. These are not exclusive to northern China; alternative forms vary by word and context. The ending -r is not an additional spoken syllable.

See `CONVERSATIONAL_EXPRESSION_REVIEW.txt` and `REGIONAL_EXPRESSION_MARKERS.json` for stable per-expression IDs and markers.

## Grammar structure and audio

Grammar pattern headings show reusable schematic constructions, NOT utterances for text-to-speech. Only concrete example.hanzi is an audio target. Each example teaching note adds situation-specific guidance rather than repeating function_en.

Canonical catalog references were extended only for newly introduced grammatical label characters in non-spoken structural formulas (no prior references changed).

## Export and linguistic review v1.1.4

The CMX expression index now prefers actual English translations over grammar descriptions; review models have real English glosses rather than placeholders. Neutral-tone 不 (bu) in A-not-A questions, 有没有 (yǒu méiyǒu) segmentation, common-noun 美金 (měijīn) capitalization, and ASCII Pinyin apostrophes were standardized. The five earlier naturalness rewrites were subsequently reversed in v1.1.5 after their attestation in the source was confirmed; the alternatives are now comments below the original expressions. Stable CMX IDs are preserved.

## v1.1.5 usage notes

Course uses general-lesson v3.3.0 in Core v3.4.0: five source-authenticated phrases are restored; usage comments appear visually beneath expressions in JSON-derived HTML/MD and browser. See EXPRESSION_USAGE_NOTES.tsv for CMX-ID keyed notes. No new topics or exercises.
