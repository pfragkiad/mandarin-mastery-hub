# HSK Level 6 Version 1.0.0 Build

The [1.0.0 handoff](../importer/hsk/hsk3_level6_1.0.0.json) contains all 1,800 entries and 3,600 examples. It incorporates 69 accepted replacements and 635 additional rewrites requested by the owner. **All 693 examples flagged in the original review have been replaced.**

| Change | Count |
| --- | ---: |
| Owner-accepted replacements | 69 |
| Additional contextual rewrites | 635 |
| Total replaced examples | 704 |
| Additional pinyin-only corrections | 17 |
| Changed examples | 721 |
| Changed entries | 604 |
| Unchanged examples | 2879 |
| Duplicate sentence texts | 0 |

The [change sheet](hsk-level6-1.0.0-example-changes.tsv) provides before/after Chinese, pinyin and English for every change. The [audit JSON](hsk-level6-1.0.0-build.json) retains complete before/after example records and output checksums. The [revision input](../importer/data/hsk-level6/release-1.0.0-revisions.json) binds the baseline and all review files by checksum.

All lexical fields, record order and taxonomy remain exact. The [0.1.0 handoff](../importer/hsk/hsk3_level6_0.1.0.json) and original reviews remain unchanged. New text never inherits corpus sentence IDs, source recordings or exact-source claims. The 17 pinyin-only corrections retain their original Chinese, English and source attribution: 15 noun uses of 结果 plus classifier 只 and structural 的 followed by 士兵.

Rewritten conversational examples are at most 16 characters and written examples at most 20, counting punctuation. New written drafts have at least 10 characters; the accepted 5369 转 example retains its reviewed nine-character wording. The written 4282 结果 example uses the accepted correction 这棵果树去年开始结果。 rather than the rejected autumn-flowering generalization.

The 635 additional rewrites are newly authored drafts, distinct from the 69 owner-accepted examples. The release does not claim independent native-speaker certification or a strict HSK vocabulary-boundary audit. Application vocabulary, fonts and recordings have not been imported or changed.

From the repository root:

```sh
python scripts/build-hsk-level6-release.py --write
python scripts/build-hsk-level6-release.py --check
node scripts/validate-hsk-level6.mjs --source importer/hsk/hsk3_level6_1.0.0.json
```

Output SHA-256: `60f9241380ca88cae9c506cbe60bbf16f2d11e5093e1872f93834f1f12554a0d`.
