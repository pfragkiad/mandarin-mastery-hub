# Chinese and English review — first candidates

Start with [Batch 1: explicit OK tags](tatoeba-chinese-english-review-01-ok.tsv): **375 rows**,
covering 375 currently uncovered exact characters and **220 distinct
Chinese sentence texts**. These are the existing first-choice candidates, not
every OK-tagged sentence in the corpus. Frequent characters come first using the
recorded all-script character usage ranks. Unknown ranks sort last.

[Batch 2: positive ratings without an OK tag](tatoeba-chinese-english-review-02-positive.tsv) contains the
other **849 first-choice rows**. Keep it separate until Batch 1 is
reviewed. Together the batches partition the unchanged
[full candidate handoff](tatoeba-translation-review.tsv); no second-choice alternatives are added.

Both TSVs contain exactly `id`, `character`, `sentence`, `translation`. Their
stable IDs preserve the Chinese sentence ID, direct English sentence ID and exact
target character. Repeated sentence texts occur because one sentence can be the
first candidate for several characters; review the wording consistently and
retain every affected row ID.

## Reviewer brief

Review **both the Chinese and the English**, independently. Tatoeba's source OK
tag is selection evidence, not the outcome of this review.

1. **Chinese:** check grammar, naturalness, word choice, completeness and whether
   the wording makes sense without missing context. Identify awkward translated
   Chinese, unclear references, outdated usage or fragments. Distinguish valid
   regional/register differences from errors. Preserve the recorded script;
   do not silently convert Simplified/Traditional or standardize regional usage.
2. **English:** check faithful meaning and natural wording, including negation,
   aspect, modality, quantities, subject/object relationships and register. Flag
   additions, omissions and interpretations unsupported by the Chinese.
3. **Character context:** confirm the exact target occurs and is useful in this
   context. Flag cases needing additional context, including names/transliterations
   when their teaching purpose is unclear. No target dictionary sense or pinyin
   is supplied, so do not certify a character reading/sense or audio from this TSV.

Keep IDs unchanged. Work on a copy; source wording remains preserved in the
original handoff. Return corrections or flags keyed by the exact ID, stating
whether the issue concerns Chinese, English or context. If wording is ambiguous,
flag it instead of inventing an intended meaning. A Chinese edit must be explicit
and separate from an English correction. Passing English alone does not approve
the Chinese, and vice versa. Pinyin/audio need a separate review.

## Status and reproduction

All rows are **pending external Chinese-and-English review**. No new approval,
AI-review result or application example is created by exporting these batches.
Source concerns and marker metadata remain in the
[Tatoeba evidence handoff](../importer/data/tatoeba/selected/README.md), bound to
the original text hash. Later findings must retain that binding and their scope.

Generate all three TSVs and this guide with
`python scripts/export-tatoeba-translations.py`; verify with `--check`.
Run `python scripts/prepare-tatoeba.test.py` for identity/partition checks.
