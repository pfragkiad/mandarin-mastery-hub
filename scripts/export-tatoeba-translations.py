#!/usr/bin/env python3
"""Minimal translation-review TSV: stable id, exact character, Chinese, English.

Select one representative direct translation for each currently uncovered exact
Characters record, using only eligible positive-marked Tatoeba sentences. Source
OK marks, self-reported contributor levels and positive English marks prioritize
candidates; these are review inputs, never approved app assignments.
"""
import argparse
import csv
import io
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from vocabulary_store import read_vocabulary

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'reports/tatoeba-translation-review.tsv'
SELECTED = ROOT / 'importer/data/tatoeba/selected'
BATCH_OK = ROOT / 'reports/tatoeba-chinese-english-review-01-ok.tsv'
BATCH_OTHER = ROOT / 'reports/tatoeba-chinese-english-review-02-positive.tsv'
GUIDE = ROOT / 'reports/tatoeba-chinese-english-review-guide.md'


def build():
    inventory = json.loads((ROOT / 'reports/tatoeba-positive-inventory.json').read_bytes())
    records = [json.loads(line) for part in inventory['parts']
               for line in (SELECTED / part).read_text('utf-8').splitlines()]
    ids = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    vocabulary = read_vocabulary(ROOT / 'src/data/vocabulary')['entries']
    covered = set(''.join(example['simplified'] for entry in vocabulary for example in entry['examples']))
    lessons = json.loads((ROOT / 'public/data/character-hsk-examples.json').read_bytes())['examples']
    covered.update(row['character'] for row in lessons.values())
    missing = ids.keys() - covered
    candidates = {}
    for sentence in records:
        if not sentence['marking']['eligibleForSecondaryReview']:
            continue
        translations = [row for row in sentence['englishTranslations'] if not row['marking']['holds']]
        for translation in translations:
            # Deterministic evidence/length priority, not an AI quality score.
            priority = (not sentence['marking']['okTag'],
                        not translation['marking']['positiveMarked'],
                        sentence['ownerSelfReportedMandarinLevel'] != 5,
                        len(sentence['text']), len(translation['text']), sentence['id'], translation['id'])
            for glyph in set(sentence['text']) & missing:
                if glyph not in candidates or priority < candidates[glyph][0]:
                    candidates[glyph] = (priority, sentence, translation)
    stream = io.StringIO(newline='')
    writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
    writer.writerow(['id', 'character', 'sentence', 'translation'])
    for glyph in sorted(candidates):
        _, sentence, translation = candidates[glyph]
        identity = f"tatoeba:{sentence['id']}:{translation['id']}:U+{ord(glyph):04X}"
        writer.writerow([identity, glyph, sentence['text'], translation['text']])
    return stream.getvalue(), len(candidates)


def review_batches(text):
    """Keep each first-choice candidate intact, separating exact OK evidence.

    The batch order uses the supplied character frequency rank, not a new
    linguistic quality score. Row IDs/text remain identical to the full handoff.
    """
    inventory = json.loads((ROOT / 'reports/tatoeba-positive-inventory.json').read_bytes())
    records = {row['id']: row for part in inventory['parts']
               for row in (json.loads(line) for line in (SELECTED / part).read_text('utf-8').splitlines())}
    ranks = json.loads((ROOT / 'public/data/usage-order.json').read_bytes())['scopes']['all']['characters']
    reader = csv.DictReader(io.StringIO(text), delimiter='\t')
    groups = {True: [], False: []}
    for row in reader:
        source = records[int(row['id'].split(':')[1])]
        if not source['marking']['eligibleForSecondaryReview']:
            raise ValueError('A first candidate is no longer eligible')
        groups[source['marking']['okTag']].append(row)
    outputs = {}
    for ok, path in ((True, BATCH_OK), (False, BATCH_OTHER)):
        stream = io.StringIO(newline='')
        writer = csv.DictWriter(stream, fieldnames=['id', 'character', 'sentence', 'translation'], delimiter='\t', lineterminator='\n')
        writer.writeheader()
        writer.writerows(sorted(groups[ok], key=lambda row: (ranks.get(row['character'], float('inf')), row['character'])))
        outputs[path] = stream.getvalue()
    ok_count, other_count = len(groups[True]), len(groups[False])
    unique = len({row['sentence'] for row in groups[True]})
    outputs[GUIDE] = f"""# Chinese and English review — first candidates

Start with [Batch 1: explicit OK tags]({BATCH_OK.name}): **{ok_count:,} rows**,
covering {ok_count:,} currently uncovered exact characters and **{unique:,} distinct
Chinese sentence texts**. These are the existing first-choice candidates, not
every OK-tagged sentence in the corpus. Frequent characters come first using the
recorded all-script character usage ranks. Unknown ranks sort last.

[Batch 2: positive ratings without an OK tag]({BATCH_OTHER.name}) contains the
other **{other_count:,} first-choice rows**. Keep it separate until Batch 1 is
reviewed. Together the batches partition the unchanged
[full candidate handoff]({DEST.name}); no second-choice alternatives are added.

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
"""
    return outputs, ok_count, other_count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    text, count = build()
    outputs, ok_count, other_count = review_batches(text)
    outputs[DEST] = text
    for path, value in outputs.items():
        if args.check:
            if not path.exists() or path.read_text('utf-8') != value:
                raise ValueError(f'Review handoff is stale: {path.name}; rerun the exporter')
        else:
            path.write_text(value, encoding='utf-8', newline='\n')
    print(f"{'Verified' if args.check else 'Wrote'} {count:,} rows: {DEST.relative_to(ROOT)}")
    print(f'Chinese + English review: Batch 1 OK = {ok_count:,}; Batch 2 positive-only = {other_count:,}.')


if __name__ == '__main__':
    main()
