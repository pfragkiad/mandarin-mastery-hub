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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    text, count = build()
    if args.check:
        if not DEST.exists() or DEST.read_text('utf-8') != text:
            raise ValueError('Translation review TSV is stale; rerun the exporter')
    else:
        DEST.write_text(text, encoding='utf-8', newline='\n')
    print(f"{'Verified' if args.check else 'Wrote'} {count:,} rows: {DEST.relative_to(ROOT)}")


if __name__ == '__main__':
    main()
