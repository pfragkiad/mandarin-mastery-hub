# Validation of the HSK Levels 1–5 official-ID report

The [supplied report](hsk-level1-5-official-id-crosscheck.md) and its JSON were
checked against the preserved current official PDF extraction, all five current
handoffs and all 3,600 runtime entries. **All 1,092 ID remaps in the JSON are
correct.** No vocabulary, source handoff, recording or lesson file is changed by
this validation. The original report is retained unchanged.

| Level | Entries | Changed official IDs | Unchanged IDs |
| --- | ---: | ---: | ---: |
| 1 | 300 | 35 | 265 |
| 2 | 200 | 15 | 185 |
| 3 | 500 | 108 | 392 |
| 4 | 1,000 | 317 | 683 |
| 5 | 1,600 | 617 | 983 |
| Total | 3,600 | 1,092 | 2,508 |

## Corrections to the report

The Markdown homograph summary gives two incorrect official IDs. The official
PDF and the report's own JSON give **乘1 = 1081** (old ID 1078), and **等2 = 1147**
(old ID also 1147). The Markdown's 1077 and 1149 must not be used. The complete
JSON ID-remap list is correct; 等 has a homograph-label correction without an ID change.

“Zero headword+pinyin set differences / exact bijection” needs qualification.
Written-form coverage is unchanged and the entry mapping is one-to-one, but
小朋友 has a real neutral-versus-third-tone discrepancy. The other two Level 1
reading differences are apostrophe/spacing formatting only: 女儿 and 谁.

## Additional findings that matter for migration

**Level 3 classifications need actual correction.** 还 huán, 换 and 回答 must be
verbs; 环境 and 黄色 must be nouns. The incorrect labels are present both in the
handoffs' `pos_ids`/primary POS and the application's `partOfSpeech` and
`studyMetadata`, rather than only in documentary Chinese labels. Their meanings
and examples already fit the correct senses. Both official PDFs agree on these
POS values, so this is an existing data defect, not a newly revised official classification.

**Level 5 白 needs a sense/example correction as well as POS.** The official row
2012 is adverb 副. The handoff currently says “white; in vain” and includes
`你的衬衫真白。` and `她把白纸放在桌上。` Both examples teach the adjective “white.”
Changing only the label to adverb would leave both examples mismatched. The
adverb meaning and two appropriate examples should be reviewed together. The
earlier official PDF allowed 形、副 (adjective and adverb); the current PDF gives
only 副. The adjective examples fit the earlier published scope, but do not
demonstrate the restricted current entry. This is a real official POS-scope
revision, distinct from the five Level 3 data defects.

**小朋友 requires an explicit pronunciation decision.** Both official PDFs print
`xiǎopéngyǒu`; the stored word and preserved Shtooka recording metadata use
`xiǎopéngyou`. A recording is already attached. The source confirms a neutral-tone
recording label; no listening certification is claimed. Do not relabel that clip
as third tone or silently replace the lexical reading while keeping a mismatched
attachment. Keep the official citation reading and the recorded pronunciation
separate, or review a compatible recording before changing the active reading.

## Associated files that a migration must cover

As with the completed Level 6 migration, preserve UUIDs, record order, existing
examples and all **2,988 Level 1–5 word recordings**. Use versioned new handoffs,
an explicit old-to-current map, updated current source references and versioned
audio manifests. Retain historical inputs and their original serials. Match
numbered homographs such as 花1/花2 and 称1/称2 separately, not by form alone.

Levels 1–5 also participate in lessons. A scan finds **61 affected `syllabus_refs`
occurrences in 31 files**, **74 affected `entry_ids` occurrences in 24 files**,
and **50 introduced plus 7 reviewed curriculum-ID occurrences**. These are
occurrences in the named fields, not unique words; file sets overlap. Lesson
word links require both the recorded ID and exact headword, and curriculum
placements use IDs, so changing vocabulary IDs alone can lose or misassign links.
Update/version those bindings together and verify saved lesson/progress identities.
Regenerate ID-dependent public example sidecars from the same mapping. Do not
apply a broad numeric find/replace across unrelated editions or immutable source archives.

The [machine validation](hsk-level1-5-official-id-crosscheck-validation.json)
contains all 3,600 mappings, runtime UUIDs and source-page evidence.

```sh
python scripts/review-hsk-level1-5-ids.py --write
python scripts/review-hsk-level1-5-ids.py --check
```
