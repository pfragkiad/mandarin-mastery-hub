#!/usr/bin/env python3
"""Audit/import the supplied HSK1 v3.2 lesson ZIP against current exact vocabulary.

Preserves canonical lesson IDs and curriculum order. Validates every nested lesson,
catalog reference, taxonomy binding and word-card example before any output is written.
The supplied four-file lesson companions and source audits retain their original bytes.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / 'src/data/study_lessons'
CORE = LIBRARY / 'core'
LESSONS = LIBRARY / 'lessons'
DEFAULT_SOURCE = ROOT / 'importer/data/lessons/Mandarin_HSK_Level1_Lessons_v3.2.0_taxonomy-v2.0.0_vocab-v1.7.1.zip'
spec = importlib.util.spec_from_file_location('lesson_validation', CORE / 'validate_core.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)


def read(path):
    return json.loads(path.read_bytes())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def audit(source):
    vocabulary = {entry['hsk_index']: entry for entry in read(ROOT / 'src/data/vocabulary/level-1.json')}
    require(len(vocabulary) == 300, 'Expected 300 exact Level 1 vocabulary records')
    catalog = read(ROOT / 'public/data/catalog_ids.json')['characters']
    incoming, pending, seen = {}, {}, []
    changed_examples = changed_quizzes = 0
    nested_checksums = {}
    with zipfile.ZipFile(source) as package:
        require(package.testzip() is None, 'Source ZIP CRC mismatch')
        names = package.namelist()
        require(len(names) == len(set(names)), 'Duplicate package members')
        members = [name for name in names if name.startswith('hsk3/level1/') and name.endswith('.zip')]
        current_dirs = {path.name for path in (LESSONS / 'hsk3/level1').iterdir() if path.is_dir()}
        require(len(members) == 21 and {Path(name).stem for name in members} == current_dirs,
                'The package must replace the same 21 existing Level 1 lesson directories')
        for member in members:
            key = Path(member).stem
            require(member == f'hsk3/level1/{key}.zip', 'Unexpected nested package path')
            raw_zip = package.read(member)
            nested_checksums[member] = hashlib.sha256(raw_zip).hexdigest()
            directory = LESSONS / 'hsk3/level1' / key
            with zipfile.ZipFile(io.BytesIO(raw_zip)) as nested:
                expected = {key + '.json', key + '.html', key + '.md', 'report.md'}
                require(len(nested.namelist()) == 4 and set(nested.namelist()) == expected,
                        'Each lesson must contain exactly its four root files')
                require(nested.testzip() is None, 'Nested lesson ZIP CRC mismatch')
                raw = nested.read(key + '.json')
                lesson = json.loads(raw)
                previous = read(directory / (key + '.json'))
                require(lesson['schema_version'] == 'mandarin-topic-lesson/3.2.0', 'Unexpected lesson schema')
                require(lesson['lesson_id'] == previous['lesson_id'], 'A lesson ID changed')
                require(lesson['lesson_id'] not in incoming, 'Duplicate lesson ID')
                require(lesson['sections']['teaching_plan'] == previous['sections']['teaching_plan'],
                        'This update must preserve the existing teaching plans')
                validation.checks_lesson(lesson, catalog)
                changed_quizzes += lesson['sections']['practice'] != previous['sections']['practice']
                old_items = {item['id']: item for item in previous['sections']['vocabulary']['items']}
                for item in lesson['sections']['vocabulary']['items']:
                    refs = item['syllabus_refs']
                    require(len(refs) == 1 and refs[0]['curriculum_id'] == 'hsk3-2025', 'Unexpected syllabus identity')
                    entry_id = refs[0]['entry_id']
                    entry = vocabulary[entry_id]
                    seen.append(entry_id)
                    require((item['hanzi'], item['pinyin']) == (entry['simplified'], entry['pinyinDisplay']),
                            f'Vocabulary identity/reading mismatch: {entry_id}')
                    require([m.strip() for m in item['meaning_en'].split(';') if m.strip()] == entry['meanings'],
                            f'Vocabulary meanings differ: {entry_id}')
                    for field, recorded in [('primary_topic_id', 'primaryTopicId'), ('topic_ids', 'topicIds'),
                                            ('primary_subtopic_id', 'primarySubtopicId'), ('subtopic_ids', 'subtopicIds'),
                                            ('primary_pos_id', 'primaryPosId'), ('pos_ids', 'posIds')]:
                        require(item[field] == entry['studyMetadata'][recorded], f'Vocabulary {field} differs: {entry_id}')
                    require(len(item['examples']) == 2, 'Expected exactly two word-card examples')
                    for index, example in enumerate(item['examples']):
                        for field, recorded in [('hanzi', 'simplified'), ('pinyin', 'pinyinDisplay'), ('english', 'english'),
                                                ('style', 'style'), ('register', 'register')]:
                            require(example.get(field) == entry['examples'][index].get(recorded),
                                    f'Vocabulary example {field} differs: {entry_id}/{index + 1}')
                        changed_examples += example != old_items[item['id']]['examples'][index]
                incoming[lesson['lesson_id']] = (member, lesson)
                for name in expected:
                    pending[directory / name] = nested.read(name)
        require(Counter(seen) == Counter(range(1, 301)), 'Expected every Level 1 syllabus entry exactly once')
        curriculum_raw = package.read('curricula/HSK3_2025_LEVEL1.json')
        curriculum = json.loads(curriculum_raw)
        require(curriculum == read(LESSONS / 'curricula/HSK3_2025_LEVEL1.json'), 'The curriculum/order changed')
        validation.checks_curriculum(curriculum, LESSONS)
        # Keep package metadata out of learner-facing JSON/HTML/Markdown.
        pending[LESSONS / 'HSK_LEVEL1_PACKAGE_README.md'] = package.read('README.md')
        pending[ROOT / 'reports/hsk-level1-lessons-classification-changes.csv'] = package.read('audits/hsk1_classification_changes.csv')
        pending[ROOT / 'reports/hsk-level1-lessons-source-example-discrepancies.json'] = package.read('audits/source_example_discrepancies.json')
    manifest = read(LESSONS / 'manifest.json')
    manifest.update(package_version='3.2.0', vocabulary_data_version='1.7.1', taxonomy_version='2.0.0',
                    source_package=source.name, source_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    for item in manifest['lessons']:
        if item['lesson_id'] in incoming:
            _, lesson = incoming[item['lesson_id']]
            item['primary_topic_id'] = lesson['classification']['primary_topic_id']
            item['topic_ids'] = lesson['classification']['topic_ids']
            item['primary_subtopic_id'] = lesson['classification']['primary_subtopic_id']
            item['subtopic_ids'] = lesson['classification']['subtopic_ids']
    pending[LESSONS / 'manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    report = {'source': {'file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()},
              'packageVersion': '3.2.0', 'taxonomyVersion': '2.0.0', 'vocabularyVersion': '1.7.1',
              'lessons': 21, 'vocabularyRecords': 300, 'wordCardExamples': 600,
              'changedWordCardExamples': changed_examples, 'changedLessonQuizzes': changed_quizzes,
              'checks': {'lessonIdsPreserved': True, 'curriculumAndOrderPreserved': True,
                         'teachingPlansPreserved': True, 'allWordCardExamplesMatchRuntimeVocabulary': True,
                         'catalogReferencesValidated': True, 'schemasAndSubtopicParentsValidated': True},
              'nestedPackageSha256': nested_checksums,
              'outputFilesChanged': [str(path.relative_to(ROOT)).replace('\\', '/') for path, raw in pending.items()
                                     if not path.exists() or path.read_bytes() != raw]}
    return pending, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    pending, report = audit(args.source)
    if args.write:
        for path, raw in pending.items():
            if not path.exists() or path.read_bytes() != raw:
                path.write_bytes(raw)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({key: value for key, value in report.items() if key not in ['nestedPackageSha256', 'outputFilesChanged']}, indent=2))


if __name__ == '__main__':
    main()
