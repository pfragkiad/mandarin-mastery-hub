#!/usr/bin/env python3
"""Audit/import the exact owner-supplied Core and Other Lessons v3.3.1 release.

No content merging, regeneration, or inferred dictionary identities. All output
bytes are staged and validated before --write replaces runtime files. Requires
jsonschema; run from the repository root, using Python with that dependency.
"""
import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / 'src/data/study_lessons'
CORE = LIB / 'core'
LESSONS = LIB / 'lessons'
SOURCES = ROOT / 'importer/data/lessons'
CORE_PACKAGE = SOURCES / 'Mandarin_Core_Project_Sources_v3.3.1_taxonomy-v2.0.0.zip'
OTHER_PACKAGE = SOURCES / 'Mandarin_Other_Lessons_v3.3.1_taxonomy-v2.0.0.zip'
PINS = {
    CORE_PACKAGE: '69dd542a0273b79f2c98e24c87c0d570861ef2d7ac32719b14d8374950d38502',
    OTHER_PACKAGE: '4cb7941a7562dc372d263b1211698d8d59cacfe05bcfda3361c36ae227e79315',
    ROOT / 'reports/Mandarin_Core_Project_Sources_v3.3.1_Release_Audit.md':
        '81b04eb0b4aa610aa485edc206900188c498c8f305888a15f159c32fd902c5e7',
    ROOT / 'reports/Mandarin_Conversational_Lessons_Core-v3.3.1_Editorial_Audit.md':
        'e3032840d6afd78842c34fade25fee6e715d1833621d682bbf8c8d8b8a423d10',
}
COLLECTION = {
    'README.md': 'COLLECTION_README.md',
    'BROWSE_BY_TOPIC.html': 'BROWSE_BY_TOPIC.html',
    'EDITORIAL_AUDIT.md': 'EDITORIAL_AUDIT.md',
    'QUALITY_REPORT.json': 'QUALITY_REPORT.json',
    'REPORT.md': 'REPORT.md',
    'TOPIC_LESSON_INDEX.json': 'TOPIC_LESSON_INDEX.json',
}

from lesson_cards import cards_document, counts_of
from vocabulary_store import read_vocabulary


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_zip(raw):
    """Read only safe, unique file members; never extract archive-controlled paths."""
    with zipfile.ZipFile(io.BytesIO(raw)) as package:
        names = package.namelist()
        require(len(names) == len(set(names)), 'duplicate ZIP member')
        for name in names:
            path = PurePosixPath(name)
            require(not path.is_absolute() and '..' not in path.parts and '\\' not in name
                    and ':' not in name and not name.endswith('/'), f'unsafe ZIP member: {name}')
        require(package.testzip() is None, 'ZIP CRC mismatch')
        return {name: package.read(name) for name in names}


def progress_identity(doc):
    """Labels may change; saved section/checkpoint/target identities may not."""
    progress = doc['progress']
    return (progress['tracking_mode'], [
        (section['id'], section['section_key'], [
            (cp['id'], cp['kind'], cp['optional'], cp.get('target_id'))
            for cp in section['checkpoints']]) for section in progress['sections']])


def check_identity(new, current, context):
    require(new['lesson_id'] == current['lesson_id'], f'{context}: lesson ID changed')
    require(new['schema_version'] == current['schema_version'], f'{context}: schema version changed')
    require(progress_identity(new) == progress_identity(current), f'{context}: checkpoint identities changed')
    for section in ('practice',):
        old_ids = [q['id'] for q in current['sections'][section]['questions']]
        new_ids = [q['id'] for q in new['sections'][section]['questions']]
        require(new_ids == old_ids, f'{context}: question IDs/order changed')


def curriculum_identity(doc):
    """Ignore supplied titles/descriptions while retaining every placement field."""
    return (doc['curriculum_id'], doc['edition'], doc['schema_version'],
            [(t['id'], t['global_topic_ids']) for t in doc['course_topics']],
            [(s['section_id'], s['sequence'], s.get('level_number'), [
                (u['unit_id'], u['sequence'], u['placements']) for u in s['units']])
             for s in doc['sections']])


def check_words(doc, entries, each_dict):
    """Validate recorded HSK bindings only; unlinked expressions stay unlinked.

    This release has no HSK-bound word bank. Its character-lesson expressions have
    null HSK/catalog bindings; matching them by spelling would invent identity.
    The same check is used on all retained HSK lessons against the runtime cards.
    """
    count = 0
    for node in each_dict(doc):
        refs = node.get('syllabus_refs', [])
        require(not node.get('hsk_syllabus_id') or refs,
                f"{doc['lesson_id']}/{node.get('id')}: unsupported HSK binding")
        for ref in refs:
            context = f"{doc['lesson_id']}/{node.get('id')}/HSK #{ref['entry_id']}"
            require(ref['curriculum_id'] == 'hsk3-2025', f'{context}: unsupported HSK edition')
            matches = [e for e in entries if e.get('hsk_index') == ref['entry_id']
                       and e.get('simplified') == node.get('hanzi')
                       and e.get('hskSource', {}).get('sourceId') == str(ref['entry_id'])]
            require(len(matches) == 1, f'{context}: HSK identity/headword does not resolve exactly once')
            entry = matches[0]
            require(node['pinyin'] == entry['pinyinDisplay'], f'{context}: pinyin/tones differ')
            require(node['meaning_en'] == '; '.join(entry['meanings']), f'{context}: meanings differ')
            if 'examples' in node:
                fields = [('hanzi', 'simplified'), ('pinyin', 'pinyinDisplay'),
                          ('english', 'english'), ('style', 'style'), ('register', 'register')]
                wanted = [[e.get(b) for _, b in fields] for e in entry.get('examples', [])]
                actual = [[e.get(a) for a, _ in fields] for e in node['examples']]
                require(actual == wanted, f'{context}: examples differ from dictionary cards')
            count += 1
    return count


def audit():
    sources = {}
    for path, expected in PINS.items():
        actual = sha(path.read_bytes())
        require(actual == expected, f'{path.name}: source checksum mismatch')
        sources[str(path.relative_to(ROOT))] = actual
    core_files = read_zip(CORE_PACKAGE.read_bytes())
    require(len(core_files) == 20 and all('/' not in n for n in core_files), 'Expected 20 root Core files')
    # This patch may change authoring copy, never schemas, taxonomy, or executable tools.
    protected = {p.name for p in CORE.glob('*.schema.json')} | {'lesson_categories.json'}
    require(len(protected) == 7, 'Expected six schemas and one taxonomy registry')
    for name in protected:
        require(core_files.get(name) == (CORE / name).read_bytes(), f'{name}: schema/taxonomy changed')
    require(not any(name.endswith('.py') for name in core_files), 'Core package contains executable tools')
    writes = {CORE / name: raw for name, raw in core_files.items()}
    writes[CORE / '.gitattributes'] = ('# Preserve canonical authoring-source bytes from the supplied Core ZIP.\n'
        + '.gitattributes -text\n'
        + '# Supplied Markdown uses trailing spaces for hard line breaks.\n*.md whitespace=-blank-at-eol\n'
        + ''.join(f'{name} -text\n' for name in sorted(core_files))).encode()
    package = read_zip(OTHER_PACKAGE.read_bytes())
    expected_members = {'README.md', 'curricula/CONVERSATIONAL_MANDARIN.json'} | {
        f'conversational_mandarin/{name}' for name in COLLECTION}
    replacements, lesson_report = {}, {}
    for prefix, target, expected_count in [('conversational_mandarin/topics/', 'conversational', 15),
                                            ('independent/', 'independent', 2)]:
        members = sorted(n for n in package if n.startswith(prefix) and n.endswith('.zip'))
        require(len(members) == expected_count, f'{prefix}: wrong lesson count')
        expected_members.update(members)
        existing = {p.name for p in (LESSONS / target).iterdir() if p.is_dir() and '_LESSON_' in p.name}
        require({PurePosixPath(n).stem for n in members} == existing, f'{target}: replacement set changed')
        for name in members:
            stem = PurePosixPath(name).stem
            directory = LESSONS / target / stem
            files = read_zip(package[name])
            require(set(files) == {f'{stem}.json', f'{stem}.html', f'{stem}.md', 'report.md'},
                    f'{stem}: expected exactly four root lesson files')
            doc = json.loads(files[f'{stem}.json'])
            current = json.loads((directory / f'{stem}.json').read_bytes())
            check_identity(doc, current, name)
            require(doc['lesson_id'] not in replacements, f'{stem}: duplicate lesson ID')
            if target == 'independent':
                require(doc == current, f'{stem}: character lesson content changed')
            replacements[doc['lesson_id']] = doc
            writes.update({directory / n: raw for n, raw in files.items()})
            lesson_report[doc['lesson_id']] = {
                'directory': str(directory.relative_to(ROOT)), 'nested_sha256': sha(package[name]),
                'files': {n: sha(raw) for n, raw in files.items()},
                'checkpointIdentitiesPreserved': True, 'contentChanged': doc != current,
                **counts_of(doc),
            }
    require(set(package) == expected_members, 'Unexpected Other Lessons package members')
    course_path = LESSONS / 'curricula/CONVERSATIONAL_MANDARIN.json'
    course_raw = package['curricula/CONVERSATIONAL_MANDARIN.json']
    course = json.loads(course_raw)
    require(curriculum_identity(course) == curriculum_identity(json.loads(course_path.read_bytes())),
            'Conversational curriculum placements/identities changed')
    writes[course_path] = course_raw
    for name, destination in COLLECTION.items():
        writes[LESSONS / 'conversational' / destination] = package[f'conversational_mandarin/{name}']
    writes[LESSONS / 'conversational/PACKAGE_README.md'] = package['README.md']
    # Validate all retained lessons with the incoming schemas, not only replacements.
    entries = read_vocabulary()['entries']
    with tempfile.TemporaryDirectory(prefix='mandarin-core-331-') as tmp:
        staging = Path(tmp)
        for name, raw in core_files.items():
            (staging / name).write_bytes(raw)
        spec = importlib.util.spec_from_file_location('core_331_validation', CORE / 'validate_core.py')
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        validator.HERE = staging
        with contextlib.redirect_stdout(io.StringIO()):
            validator.run_test()
        catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
        active, word_count, replacement_word_count = {}, 0, 0
        for path in sorted(LESSONS.rglob('*_LESSON_*/*.json')):
            if 'legacy' in path.relative_to(LESSONS).parts:
                continue
            doc = json.loads(writes.get(path, path.read_bytes()))
            require(doc['lesson_id'] not in active, f'{path}: duplicate active lesson ID')
            try:
                validator.checks_lesson(doc, catalog)
                matched = check_words(doc, entries, validator.each_dict)
                word_count += matched
                if doc['lesson_id'] in replacements:
                    replacement_word_count += matched
            except (ValueError, KeyError) as err:
                raise ValueError(f'{path.relative_to(ROOT)}: {err}') from err
            active[doc['lesson_id']] = doc
        require(len(active) == 63, 'Expected 63 active lessons')
        curriculum_paths = sorted((LESSONS / 'curricula').glob('*.json'))
        for path in curriculum_paths:
            doc = json.loads(writes.get(path, path.read_bytes()))
            validator.checks_curriculum(doc)
            placed = [p for s in doc['sections'] for u in s['units'] for p in u['placements']]
            require(all(p['lesson_id'] in active and all(i in active for i in p['prerequisite_lesson_ids'])
                        for p in placed), f'{path.name}: unresolved placement/prerequisite')
    counts = {ident: counts_of(doc) for ident, doc in active.items()}
    writes[LESSONS / 'lesson-cards.json'] = cards_document(counts)
    report = {
        'sources': sources, 'core': {'files': {n: sha(raw) for n, raw in core_files.items()},
                                   'schemaAndTaxonomyBytesUnchanged': True, 'templatesValidated': 8},
        'lessons': lesson_report,
        'checks': {'validatedActiveLessons': len(active), 'validatedCurricula': len(curriculum_paths),
                   'exactHskWordBindingsMatched': word_count,
                   'replacementHskWordBindings': replacement_word_count,
                   'unlinkedExpressions': 'Preserved as supplied; no HSK identity or dictionary match inferred.',
                   'curriculumPlacementsPreserved': True, 'runtimeVocabularyUntouched': True,
                   'hskLessonsUntouched': True, 'sourceContentRewritten': False},
        'outputFilesChanged': [str(p.relative_to(ROOT)) for p, raw in writes.items()
                               if not p.exists() or p.read_bytes() != raw],
    }
    return writes, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path, help='Optional audit JSON destination')
    args = parser.parse_args()
    writes, report = audit()
    if args.write:
        for path, raw in writes.items():
            if not path.exists() or path.read_bytes() != raw:
                path.write_bytes(raw)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"20 Core files; 17 lessons checked; {report['checks']['validatedActiveLessons']} active lessons valid; "
          f"{len(report['outputFilesChanged'])} files {'written' if args.write else 'would change'}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, zipfile.BadZipFile) as err:
        print(f'INVALID: {err}', file=sys.stderr)
        sys.exit(1)
