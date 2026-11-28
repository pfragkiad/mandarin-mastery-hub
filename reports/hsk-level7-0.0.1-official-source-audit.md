# Official HSK advanced vocabulary: 0.0.1 source audit

The [official HSK site](https://www.chinesetest.cn/) links directly to
[this syllabus PDF](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). Its cover identifies the
November 2025 edition, effective July 2026. The vocabulary table gives a shared
**Levels 7–9** band, with **5,600 entries, serials 5401–11000**, on PDF pages
215–354. It does not allocate these rows separately to Level 7, Level 8 or Level 9.

The [requested seed](../importer/hsk/hsk3_level7_0.0.1.json) preserves every advanced row, reading,
raw POS value, homograph suffix and PDF page. Its filename retains the owner's
Level 7 working name, while its metadata explicitly identifies the shared band.
There are 443 blank official POS cells and 5,585 distinct written forms; repeated
forms remain separate records. Each entry now includes one newly authored example,
either conversational or written, with assisted pinyin and an English translation.
The [sentence review](hsk-level7-0.0.1-sentence-review.md) records checks and remaining
reading/POS questions. English word meanings and classifications are pending.
The seed uses a distinct schema and is not ready for the runtime importer.

## Level 6 comparison

The existing [Level 6 release](../importer/hsk/hsk3_level6_1.0.0.json) matches
**all 1,800 ID/headword/reading/POS tuples** in the
[earlier official PDF it cited](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf) exactly.
The PDF currently linked by the official website also contains the **same 1,800
headword/reading/POS tuples**, but **850 serial numbers differ** because the
ordering changed. The remaining 950 serials match. Matching uses the full tuple
and retains the separate pronunciation entries for 卷, 散 and 吐.

For example, the earlier PDF numbers 案例 as 3602 and 按摩 as 3603; the current
PDF numbers 按摩 as 3602 and 案例 as 3603. These are numbering changes, not added,
removed or differently pronounced Level 6 words. The
[complete 1,800-row crosswalk](hsk-level6-official-numbering-crosswalk.tsv) records
both official IDs and PDF pages. No application record IDs, words, examples or
recordings are changed. Reconciliation of the existing official-number display
is a separate data migration; do not overwrite UUIDs or HSK indices implicitly.

## Evidence and checks

Both exact PDF downloads, the official download-page snapshot and their extracted
text are preserved under [the input directory](../importer/data/hsk-level7/README.md).
The [manifest](../importer/data/hsk-level7/source-manifest.json) records byte lengths,
SHA-256 checksums, URLs and extraction details. The two PDFs are different files
carrying the same printed edition; `1219` in the current filename alone is not
treated as a new syllabus edition. PDF pages 170 and 215 were rendered and checked
for column boundaries, Level 6 order and the shared 7–9 label.

All 11,000 current official serials were parsed in order without gaps or merges.
Counts are 300 / 200 / 500 / 1,000 / 1,600 / 1,800 / 5,600 for Levels 1–6 and 7–9.
The [machine audit](hsk-level7-0.0.1-official-source-audit.json) records the checks
and output checksum. The seed is 4,383,316 bytes and needs no split at this
stage; its entries each occupy one line. All 5,600 example readings pass the shared
structural aligner; examples remain editorial drafts needing language review.

```sh
python scripts/prepare-hsk-level7.py --write
python scripts/prepare-hsk-level7.py --check
```
