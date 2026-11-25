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
| [chengyu_all8519_topic_classification.json](chengyu_all8519_topic_classification.json) | Separate topic/subtopic proposals for every exact input ID, using the existing Vocabulary taxonomy v2.0.0; meanings, draft status, evidence, competing matches and exact existing HSK assignments remain attached. Offline only. |
| [chengyu_topic_rules.json](chengyu_topic_rules.json) | Editable meaning rules, English-metaphor handling and ID/headword-bound editorial assignments/holds consumed by `scripts/classify-chengyu-topics.py`. Rule scores are priorities, not accuracy estimates. |

All added English is **unreviewed**. Dictionary-derived text is not upgraded to
human acceptance, and preserved English is recorded as supplied/unassessed.
The additions comprise 5,159 CC-CEDICT lookups, 915 Wiktionary lookups, 182 PETCI
dictionary-field lookups, and 2,158 assistant drafts. Chinese Xinhua explanations
support drafts where available; they are not an authoritative approval layer.
The generator uses exact headwords or explicit source forms/references for
English, never fuzzy matching. It does not use PETCI's Google/DeepL columns.

## Separate topic classification

[chengyu_all8519_topic_classification.json](chengyu_all8519_topic_classification.json)
uses the exact 22 topics and 25 parented subtopics of
[Vocabulary taxonomy v2.0.0](../../hsk/hsk3_topics.json). It retains a checksum-bound
copy of that registry for reviewers; this is not an alternative taxonomy.
Every input ID/headword appears once, in the original order. This output does
not change the English sheet, vocabulary records, categories or frontend.

Each entry contains `primaryTopicId`, ordered `topicIds`, optional
`primarySubtopicId`, `subtopicIds`, a reason, method, confidence/evidence label,
review status, original English, and the English text used by the rules.
Subtopics always belong to a listed topic; the primary subtopic, when present,
belongs to the primary topic. Secondary topics are explicitly authored only;
other matching rules remain evidence rather than silently becoming tags.

Coverage: **8,517 assignments and 2 holds**. There are 8,516 unreviewed draft
assignments and one retained, unassessed Vocabulary assignment. Of the new
proposals, 1,336 have explicit editorial assignments and 7,180 use meaning rules.
The holds are 玫瑰人生 (ID 5603) and 东成西就 (ID 8232), whose intended phrase/work
referents need context; they have null primary fields and empty tag arrays.
No new assignment is labelled accepted or human-approved.

Automatic rules inspect English meanings, with explicit figurative sections
preferred over literal descriptions. Known English metaphors such as “food for
thought” are normalized separately and recorded. They do not match individual
Chinese characters to infer a topic. Editorial assignments handle common gaps,
figurative traps and known titles/names; they remain AI-authored drafts.
English quality and multiple senses can affect the result. In particular,
**2,039 drafts have competing topic evidence** and are flagged for priority
review. Rule scores express precedence, not confidence percentages or accuracy.

`existingVocabulary` preserves exact current IDs, HSK levels, taxonomy fields and
source metadata for all five overlaps. The four HSK idioms currently carry the
generic `grammar-functions` topic; this sidecar proposes semantic alternatives
and flags the differences. It leaves those runtime assignments untouched.
十字路口 retains its current `places-directions` assignment, including its null
subtopic. Membership in this input still does not certify idiom status.

Regenerate/check from the repository root:

```powershell
python scripts/classify-chengyu-topics.py --write
python scripts/classify-chengyu-topics.py --check
python scripts/classify-chengyu-topics.test.py
```

Edit the rules/explicit entries in `chengyu_topic_rules.json` and regenerate to
revise a proposal. The generator binds IDs and exact headwords to the immutable
original handoff and records hashes of the current meanings, taxonomy, rules,
English provenance and Vocabulary inputs. Consumers are reviewers and future
offline import work; there is no automatic application import.

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
