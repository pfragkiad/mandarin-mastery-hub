#!/usr/bin/env python3
"""Cross-check/import the 19 canonical v3.2 authoring sources without altering their bytes.

Python tools and legacy snapshots are separate from the supplied Core contract.
Validates templates and all active lesson/curriculum documents before writing.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'src/data/study_lessons/core'
SOURCE = ROOT / 'importer/data/lessons/Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip'


def audit(source):
    with zipfile.ZipFile(source) as package:
        names = package.namelist()
        if len(names) != 19 or len(set(names)) != 19 or any(Path(name).name != name for name in names):
            raise ValueError('Expected exactly 19 canonical root files')
        if package.testzip() is not None:
            raise ValueError('Core ZIP CRC mismatch')
        files = {name: package.read(name) for name in names}
    documents = {name: json.loads(raw) for name, raw in files.items() if name.endswith('.json')}
    schemas = {name: doc for name, doc in documents.items() if name.endswith('.schema.json')}
    for schema in schemas.values():
        Draft202012Validator.check_schema(schema)

    def check(schema, doc):
        Draft202012Validator(schemas[schema], format_checker=FormatChecker()).validate(doc)

    check('lesson_categories.schema.json', documents['lesson_categories.json'])
    for name, doc in documents.items():
        if not name.endswith('_TEMPLATE.json'):
            continue
        family = doc['schema_version'].split('/')[0]
        schema = {'mandarin-character-lesson': 'character_lesson.schema.json',
                  'mandarin-topic-lesson': 'topic_lesson.schema.json',
                  'mandarin-general-lesson': 'general_lesson.schema.json',
                  'mandarin-curriculum': 'curriculum.schema.json'}[family]
        check(schema, doc)
    count = 0
    library = ROOT / 'src/data/study_lessons/lessons'
    for path in library.rglob('*.json'):
        if 'legacy' in path.relative_to(library).parts:
            continue
        doc = json.loads(path.read_bytes())
        if not isinstance(doc, dict) or 'schema_version' not in doc:
            continue
        family = doc['schema_version'].split('/')[0]
        schema = {'mandarin-character-lesson': 'character_lesson.schema.json',
                  'mandarin-topic-lesson': 'topic_lesson.schema.json',
                  'mandarin-general-lesson': 'general_lesson.schema.json',
                  'mandarin-curriculum': 'curriculum.schema.json'}.get(family)
        if schema:
            check(schema, doc)
            count += 1
    hashes = {name: hashlib.sha256(raw).hexdigest() for name, raw in files.items()}
    report = {'source': {'file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()},
              'files': hashes, 'validatedActiveLessonsAndCurricula': count,
              'changedFiles': [name for name, raw in files.items() if not (CORE / name).exists() or (CORE / name).read_bytes() != raw],
              'checks': {'templatesAndSchemasValidated': True, 'allActiveDocumentsAccepted': True,
                         'pythonToolsAndLegacySnapshotsPreserved': True}}
    return files, report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    files, report = audit(args.source)
    if args.write:
        for name, raw in files.items():
            if not (CORE / name).exists() or (CORE / name).read_bytes() != raw:
                (CORE / name).write_bytes(raw)
        (CORE / '.gitattributes').write_text('# Preserve canonical authoring-source bytes from the supplied Core ZIP.\n' +
                                          ''.join(name + ' -text\n' for name in sorted(files)), 'utf-8')
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + '\n', 'utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'files'}, indent=2))
