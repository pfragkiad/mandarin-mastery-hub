# Levels 1-5 official-numbering migration

Applied the full owner-approved migration against the preserved, currently linked
official HSK syllabus PDF. All 1,092 report remaps were independently confirmed;
two Markdown-only homograph ID typos are corrected in the
[companion validation](hsk-level1-5-official-id-crosscheck-validation.md).
Historical source files and audio package manifests remain exact.

| Level | Current handoff | Changed official IDs | Preserved word recordings |
| --- | --- | ---: | ---: |
| 1 | [hsk3_level1_1.7.2.json](../importer/hsk/hsk3_level1_1.7.2.json) | 35 | 276 |
| 2 | [hsk3_level2_1.1.2.json](../importer/hsk/hsk3_level2_1.1.2.json) | 15 | 166 |
| 3 | [hsk3_level3_1.1.3.json](../importer/hsk/hsk3_level3_1.1.3.json) | 108 | 443 |
| 4 | [hsk3_level4_1.1.2.json](../importer/hsk/hsk3_level4_1.1.2.json) | 317 | 797 |
| 5 | [hsk3_level5_1.0.6.json](../importer/hsk/hsk3_level5_1.0.6.json) | 617 | 1306 |

All 3,600 word UUIDs and entry order remain exact, as do all 2,988 word recordings
and lexical readings. The five incorrect Level 3 POS assignments (678-682) are
fixed. Level 5 白 (2012) follows the current adverb-only POS and meaning
"in vain; for nothing" with two newly authored examples:

- Conversational: 别去了，去了也是白去。 (Don't go; going would be pointless.)
- Written: 由于地址有误，快递员白跑了一趟。 (The courier made a wasted trip because the address was wrong.)

These two drafts carry new example identities and language-review flags. The
other 7,198 example IDs are preserved. Official 小朋友 citation pinyin
xiǎopéngyǒu is retained separately from its existing neutral-tone lexical
reading and matching recorded clip; neither speech metadata nor the source PDF
is silently changed.

## Lesson and associated data bindings

Canonical lesson packages retain their exact source bytes and serials. A shared,
explicit previous-ID resolver keeps lesson lookups, curriculum placements and
flashcard pools attached to exact UUID/headword identities; unknown numbering
revisions fail closed. The active Python authoring importer validates the same
mapping through a read-only legacy view. Lesson, placement, question and progress
IDs are unchanged. All CDN upload pointer files remain unchanged.

The glyph example sidecar is regenerated from exact current handoff versions,
including Level 6; historical examples are not pooled into current data.

## Validation

- All five source/audio builds and the independent report review reproduce exactly.
- Repeat vocabulary imports are idempotent; other levels are unchanged.
- All five runtime arrays use one compact entry per line, with Level 5 the largest at 7,800,726 bytes.
- 47 Node importer tests, 23 audio importer tests and the targeted vocabulary/lesson frontend suites pass.
- The production build passes. The active lesson fidelity suite validates all 65 lessons and 574 exact HSK bindings.
- New examples remain editorial drafts, without native-speaker certification.

See the [source/audio build audit](hsk-level1-5-official-numbering-migration.json)
and [runtime import audit](hsk-level1-5-official-numbering-import.json) for exact
source checksums, output sizes and preservation counts.
