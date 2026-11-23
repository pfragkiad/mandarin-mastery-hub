# Conversational Mandarin — Core v3.3.1 Editorial & Validation Audit

**Source package:** `Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev3.zip`
**Output package:** `Mandarin_Other_Lessons_v3.3.1_taxonomy-v2.0.0.zip`

## Correction scope

- 15/15 lesson descriptions and subtitles edited; no course/source-process notes remain in learner-facing descriptions.
- 15/15 classification tag arrays narrowed to 2–3 content-based terms.
- 30/30 grammar-pattern headings replaced with pronounceable Mandarin and matching pinyin; examples and instructional function retained.
- 15/15 q-speaking suggested answers now complete the requested role-play; the old opening-only boilerplate was removed.
- 15/15 q-grammar tasks rewritten so the requested result is unambiguous.
- No exact cross-lesson duplicate longer utterances (5+ characters) among model dialogue, grammar examples, and model speaking answers; repeated short everyday formulas are intentional.
- One unnatural concatenation removed from the greetings key-expression review.
- Regenerated HTML and Markdown from each canonical lesson JSON.

## Identity and regression gates

- 15/15 lesson IDs unchanged.
- 60/60 question IDs unchanged.
- Existing progress checkpoint IDs, targets, kind, optional flags, and section IDs unchanged.
- Existing curriculum placements, stable placement IDs, unit IDs, and sequences unchanged.
- No changes to the independent character lesson ZIPs.
- No modifications to the authoritative Core release or the global taxonomy.

## Lesson content audits

| Lesson ID | Model turns | Practice questions | Checkpoints |
|---|---:|---:|---:|
| `convm-asking-directions` | 4 | 4 | 10 |
| `convm-choices-alternatives` | 6 | 4 | 10 |
| `convm-clock-scheduling` | 6 | 4 | 10 |
| `convm-food-drinks` | 4 | 4 | 10 |
| `convm-greetings-politeness` | 4 | 4 | 10 |
| `convm-money-prices` | 6 | 4 | 10 |
| `convm-numbers-arithmetic` | 6 | 4 | 10 |
| `convm-people-identity` | 4 | 4 | 10 |
| `convm-permission-requests` | 4 | 4 | 10 |
| `convm-places-to-meet` | 4 | 4 | 10 |
| `convm-speaking-languages` | 4 | 4 | 10 |
| `convm-today-tomorrow-later` | 6 | 4 | 10 |
| `convm-understanding-clarification` | 4 | 4 | 10 |
| `convm-wants-intentions` | 4 | 4 | 10 |
| `convm-with-someone` | 4 | 4 | 10 |

## Validation

- All 15 lessons validated with `validate_core.py --lesson ... --catalog-ids catalog_ids.json` against Core v3.3.1 schemas.
- Every known learner-visible Chinese character has an exact catalog reference.
- The package rejects leftover ellipsis, `...`, `+`, and `/` in grammar-pattern spoken fields.
- Model-answer completeness was checked against each authoring objective; this is an editorial assessment, not an automatic native-speaker certification.
- Outer ZIP and every nested lesson ZIP pass CRC integrity tests.

- Required checkpoints: **150**; optional checkpoints: **0**.

**Remaining editorial limitation:** A native-speaker language review would still be valuable. No phonetic/audio synthesis engine is included in this ZIP.
