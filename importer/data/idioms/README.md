# Owner-supplied idiom review handoff

Offline editorial material for the owner's 8,519 entries. Nothing in this
directory is loaded by the application. The supplied list also contains phrases,
proverb fragments, titles, and names; membership does not certify a chengyu.

## Review files

| File | Purpose and consumer |
| --- | --- |
| [chengyu_all8519_english_review.tsv](chengyu_all8519_english_review.tsv) | Requested English review sheet. All 8,414 originally blank English cells are populated. The 105 supplied translations, all other columns, exact IDs and row order remain unchanged. |
| [chengyu_all8519_english_review.original.tsv](chengyu_all8519_english_review.original.tsv) | Exact original TSV bytes, used as the regeneration baseline. |
| [chengyu_cumulative_all8519.json](chengyu_cumulative_all8519.json) | Original owner-supplied companion ranking/frequency material; preserved without edits and not consumed by this translation generator. |
| [chengyu_rank_classes.json](chengyu_rank_classes.json) | Original owner-supplied rank-class companion file; preserved without edits and not consumed by this translation generator. |
| [chengyu_all8519_pronunciations_merged.tsv](chengyu_all8519_pronunciations_merged.tsv) | Complete 8,519-row pronunciation list, preserving supplied pinyin and separating each reference source, alternatives, phonetic forms, regional readings, and recording links. |
| [chengyu_english_provenance.jsonl](chengyu_english_provenance.jsonl) | One attributed English decision per input ID, including method, evidence, original dictionary entries or sense references, and review status. |
| [chengyu_pronunciation_provenance.jsonl](chengyu_pronunciation_provenance.jsonl) | Per-ID pronunciation evidence with raw pinyin, regional tags, source headwords and URLs; recording file identity, speaker and licence evidence. |
| [chengyu_english_drafts.json](chengyu_english_drafts.json) | Assistant-authored English drafts, input SHA-256 binding, editorial notes and supplementary source URLs. This is an editable generator input. |
| [chengyu_english_pending.tsv](chengyu_english_pending.tsv) | Generator worklist; header only when no English gaps remain. |
| [chengyu_english_population.json](chengyu_english_population.json) | Reproducible counts and input checksums for this handoff. |

All added English is **unreviewed**. Dictionary-derived text is not upgraded to
human acceptance, and preserved English is recorded as supplied/unassessed.
The additions comprise 5,159 CC-CEDICT lookups, 915 Wiktionary lookups, 182 PETCI
dictionary-field lookups, and 2,158 assistant drafts. Chinese Xinhua explanations
support drafts where available; they are not an authoritative approval layer.
The generator uses exact headwords or explicit source forms/references for
English, never fuzzy matching. It does not use PETCI's Google/DeepL columns.

## Pronunciation and recordings

`supplied_pinyin` retains the original text verbatim. CC-CEDICT numbered syllables
are converted to tone marks in their own column; raw readings remain in the
JSONL evidence. Wiktionary standard Mandarin readings, phonetic/sandhi forms,
and regional Mandarin readings have separate columns. Only exact headwords or
explicit simplified/traditional script forms supply a reading: a differently
ordered synonym cannot pronounce the requested headword. Chinese Xinhua's
recorded pinyin is a separate, uncorrected reference column.

`sourced_alternatives` lists reference lexical readings that differ from the
supplied reading after ignoring spaces, apostrophes and hyphens. Tone marks are
significant. Multiple source spellings may describe the same reading. The
comparison values are `matches_at_least_one_source`,
`differs_from_all_listed_sources_review`, and `no_dictionary_reading`.
Agreement does not certify correctness, and disagreement does not prove an
error. There are 7,817 entries with source readings, 702 with supplied pinyin
only, and 1,013 whose supplied pinyin differs from all listed lexical readings.

The [audio-cmn inventory](sources/audio-cmn-matches.json) identifies **134 exact
whole-idiom MP3 matches** at pinned commit
`f759a0f18f27690742957619e1248ed91e9b3f2c`. The recordings are credited to Yue Tan.
The repository README declares CC BY-SA without identifying its version.
These are Git tree/file matches, **not listening-reviewed recordings**, and no
claim is made that they match a particular supplied tone reading. Blank audio
means no match in this inventory, not that no recording exists elsewhere.
No media binaries were downloaded, and no app audio was attached. Future app
integration must follow the existing Lovable CDN/audio pipeline and retain
source, speaker and licence metadata.

## Regeneration and attribution

From the repository root:

```powershell
python scripts/populate-chengyu-english.py --write
python scripts/populate-chengyu-english.py --check
python scripts/populate-chengyu-english.test.py
```

`--prepare` can write incomplete drafts and their pending worklist during editing;
`--write` and `--check` require every English cell to be populated. To change an
added translation, edit `chengyu_english_drafts.json` and regenerate; do not edit
the immutable original to work around the preservation checks.

See [source inputs and licences](sources/README.md) for URLs, source snapshots,
and extraction details. Attribution belongs with derived text. Source repository
licences are recorded as declared; they do not certify separate rights to
underlying published dictionaries. These files are for editorial review and do
not constitute a runtime release or a rights clearance.

Parent guide: [importer data](../README.md).
