# HSK 3.0 topic migration — Levels 1–4

**Taxonomy:** v2.0.0 · 22 top-level topics · 25 subtopics.

**Method:** editorial classification via explicit vocabulary mappings, sense overrides and deterministic English-gloss rules; **not** an independent human linguistic validation.

The original 20 topic IDs, labels and descriptions were retained exactly. Two new categories were appended: `science-technology` and `society-government-law`.

## Input and output releases

| Level | Baseline | New | Entries | Changed primary topic | Changed topic list | Assigned primary subtopic |
|---|---|---|---:|---:|---:|---:|
| 1 | 1.6.1 | 1.7.0 | 300 | 6 | 7 | 49 |
| 2 | 1.0.3 | 1.1.0 | 200 | 3 | 3 | 60 |
| 3 | 1.0.4 | 1.1.0 | 500 | 18 | 28 | 169 |
| 4 | 1.0.3 | 1.1.0 | 1000 | 164 | 175 | 296 |

## Compatibility

- `hsk3_topics.json` and `hsk3_topics_2.0.0.json` are identical, versioned JSON **objects** with `topics` and `subtopics` arrays. Legacy clients expecting an unversioned array must use `hsk3_topics_flat_2.0.0.json` or migrate their parser.
- Level JSON files retain their existing `entries`, `taxonomy`, `syllabus`, `verification`, and `changelog` sections; each entry adds `primary_subtopic_id` (string/null) and `subtopic_ids` (array).
- Semantic version of vocabulary dataset schema is now `hsk-example-pairs/1.3.0` (additive entry classification fields).
- All headwords, official IDs, sentence examples (Hanzi, pinyin, English, notes), part-of-speech assignments, and original verification/syllabus metadata were left unchanged.
- TXT exports were copied byte-for-byte and include the exact three original columns, so sentence-based import remains unchanged.

## Quality and limitations

- These **topic assignments remain editorial drafts**. They were built systematically and checked for reference validity, but 2,000 individual senses were not independently certified by an expert.
- Some subtopic distinctions are inherently contextual or polysemous. Every entry has a primary topic; entries under one of the nine subdivided topic families receive a primary subtopic.
- The reported migration is not an official HSK vocabulary categorization: only syllabus IDs/headwords/POS originate from the official vocabulary inventory.
- `hsk3_topics_v2_migration_changes.csv` provides a machine-readable list of changes to top-level topic assignments.

## Parent topics and subtopics

- **Shopping & Money** (`shopping-money`): `shopping-commerce`, `money-finance`
- **Home, Clothing & Objects** (`home-objects`): `home-household`, `clothing-accessories`, `everyday-objects`
- **Animals & Weather** (`animals-weather`): `animals-wildlife`, `weather-climate`, `nature-ecology`
- **Daily Actions & Activities** (`daily-actions`): `everyday-routines`, `physical-actions`, `processes-change`
- **Leisure, Music & Media** (`leisure-media`): `sports-recreation`, `arts-entertainment`, `media-literature`
- **Places, Position & Direction** (`places-directions`): `geography-places`, `position-direction`
- **Qualities, Feelings & Evaluation** (`qualities-feelings`): `emotions-attitudes`, `physical-properties`, `judgments-evaluation`
- **Science & Technology** (`science-technology`): `digital-technology`, `science-research`, `engineering-devices`
- **Society, Government & Law** (`society-government-law`): `government-politics`, `law-rights`, `society-community`

## Integrity validation

- 2,000 official IDs, consecutive 1–2000 with no duplicates.
- Each dataset contains exactly the same non-classification entry data as its source release (strict deep value-equality).
- Every topic/subtopic ID resolves to the shared v2 registry; all subtopic parent relations are consistent.
- All original POS definitions and assignments are unchanged.
- Matching TXT exports are byte-identical to the previous releases.
