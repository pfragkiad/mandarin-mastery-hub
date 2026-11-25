#!/usr/bin/env python3
"""Audit existing HSK coverage and extract exact lesson passages for uncovered characters.

No catalogue, vocabulary or lesson source is rewritten. --write updates only the
lazy fallback sidecar and offline audit; --check compares them with current inputs.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
from vocabulary_store import read_vocabulary

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public/data/character-hsk-examples.json'
REPORT = ROOT / 'reports/character-hsk-examples-audit.json'


def read(path):
    return json.loads(path.read_bytes())


def source(path):
    return {'file': path.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def triples(value, path=''):
    """Keep complete recorded triples; never mine prompts or invent translations."""
    if isinstance(value, dict):
        if all(isinstance(value.get(k), str) and value[k].strip()
               for k in ('hanzi', 'pinyin', 'english')):
            yield path, value
        for key, child in value.items():
            yield from triples(child, f'{path}/{key}')
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from triples(child, f'{path}/{index}')


def build():
    ids = read(ROOT / 'public/data/catalog_ids.json')['characters']
    entries = read_vocabulary(ROOT / 'src/data/vocabulary')['entries']
    examples = [example for entry in entries for example in entry['examples']]
    texts = {example['simplified'] for example in examples}
    source_texts = set()
    sources = []
    for path in sorted((ROOT / 'importer/hsk').glob('hsk3_level[1-5]_*.json')):
        data = read(path)
        sources.append(source(path))
        source_texts.update(example['hanzi'] for entry in data['entries']
                            for example in entry['examples'])
    # Current versioned handoffs should already be imported. A mismatch needs an
    # importer review, not silently adding stale examples beside current ones.
    if source_texts != texts:
        raise ValueError('HSK source/runtime sentence texts differ; review the vocabulary import first')
    covered = set(''.join(texts)) & ids.keys()
    missing = ids.keys() - covered
    fallbacks = {}
    eligible = scanned = lessons = conversational_lessons = conversational_triples = 0
    allowed = re.compile(
        r'/sections/(?:vocabulary/items/\d+/examples/\d+|teaching_plan/'
        r'(?:dialogue/turns/\d+|patterns/\d+/examples/\d+|reading/paragraphs/\d+))$')
    lesson_root = ROOT / 'src/data/study_lessons/lessons'
    paths = sorted((lesson_root / 'hsk3').glob('level*/TOPIC_LESSON_*/*.json'))
    paths += sorted((lesson_root / 'conversational').glob('CONVERSATIONAL_LESSON_*/*.json'))
    for path in paths:
        lesson = read(path)
        conversational = 'conversational' in path.parts
        conversational_lessons += conversational
        lessons += not conversational
        provenance = source(path)
        sources.append(provenance)
        level = None if conversational else int(path.parent.parent.name.removeprefix('level'))
        for pointer, example in triples(lesson):
            scanned += 1
            conversational_triples += conversational
            valid_path = bool(re.fullmatch(r'/sections/blocks/\d+/(?:turns/\d+|example)', pointer)) if conversational else bool(allowed.fullmatch(pointer))
            if not valid_path or not example['hanzi'].endswith(tuple('。！？!?')):
                continue
            eligible += 1
            for glyph in sorted(set(example['hanzi']) & missing):
                record_id = ids[glyph]
                if record_id in fallbacks:
                    continue
                fallbacks[record_id] = {
                    'character': glyph, 'sentence': example['hanzi'],
                    'pinyin': example['pinyin'], 'translation': example['english'],
                    'source': {**provenance, 'jsonPointer': pointer,
                               'lessonId': lesson['lesson_id'], 'title': lesson['lesson']['title'],
                               'collection': 'Conversational Mandarin' if conversational else f'HSK Level {level}',
                               'hskLevel': level, 'status': lesson['metadata']['status']},
                }
    fallbacks = dict(sorted(fallbacks.items()))
    filled = {row['character'] for row in fallbacks.values()}
    data = {'version': 1, 'examples': fallbacks}
    report = {
        'generator': 'scripts/build-character-hsk-examples.py',
        'scope': 'Current HSK Levels 1–5 vocabulary handoffs, active HSK lesson JSON and active editorial Conversational Mandarin lessons; no external corpus, raw transcripts or archived lessons.',
        'selection': 'Exact character occurrence in an existing full sentence/passage. Existing vocabulary examples take priority; recorded paragraphs, pinyin and English stay intact. No sense or character-reading validation is implied.',
        'review': 'Source editorial/draft status is retained; no native-speaker certification or sentence recording is added.',
        'counts': {'characters': len(ids), 'vocabularyExampleRecords': len(examples),
                   'distinctVocabularySentences': len(texts), 'unimportedHskSentenceTexts': len(source_texts - texts),
                   'charactersWithVocabularySentence': len(covered), 'hskLessonsScanned': lessons,
                   'conversationalLessonsScanned': conversational_lessons,
                   'conversationalSentenceTriples': conversational_triples,
                   'lessonTriplesScanned': scanned, 'eligibleLessonSentencePassages': eligible,
                   'charactersFilledFromLessons': len(filled), 'charactersCoveredAfter': len(covered | filled),
                   'charactersFilledFromConversational': sum(row['source']['hskLevel'] is None for row in fallbacks.values()),
                   'charactersStillMissing': len(missing - filled)},
        'examplesAdded': fallbacks,
        'remainingCharacters': ''.join(sorted(missing - filled)),
        'exampleReviewStatus': dict(sorted(Counter(example.get('reviewStatus', 'unrecorded') for example in examples).items())),
        'sources': sources,
    }
    return data, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data, report = build()
    for path, value in ((OUTPUT, data), (REPORT, report)):
        serialized = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
        if args.write:
            path.write_text(serialized, encoding='utf-8', newline='\n')
        elif args.check and path.read_text('utf-8') != serialized:
            raise ValueError(f'{path.relative_to(ROOT)} is stale; run with --write')
    print(json.dumps(report['counts'], indent=2))


if __name__ == '__main__':
    main()
