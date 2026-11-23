#!/usr/bin/env python3
"""Audit/import the exact owner-supplied Core and Other Lessons v3.3.2 release.

No content merging, regeneration, or inferred dictionary identities. All output
bytes are staged and validated before --write replaces runtime files. Requires
jsonschema; run from the repository root, using Python with that dependency.
"""
import argparse
import contextlib
import csv
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
CORE_PACKAGE = SOURCES / 'Mandarin_Core_Project_Sources_v3.3.2_taxonomy-v2.0.0.zip'
OTHER_PACKAGE = SOURCES / 'Mandarin_Other_Lessons_v3.3.2_taxonomy-v2.0.0_coverage-v1.1.4.zip'
PINS = {
    CORE_PACKAGE: '522b94b431e069c536c91acc9f596fca3c23bbfcc43dc6195d7fdbb7edd74bfa',
    OTHER_PACKAGE: '3ba35311ce9d208e3649e8d3645fee15b542eb0e0855d16d6b46132cfe89a560',
}
NEW_LESSONS = {
    'CONVERSATIONAL_LESSON_PHONE_INVITATIONS': 'convm-phone-invitations',
    'CONVERSATIONAL_LESSON_NEWSPAPER_SHOPPING': 'convm-newspaper-shopping',
}
# Replaced collection references absent from this release; kept in Git history.
OBSOLETE = [LESSONS / 'conversational' / name for name in ('REPORT.md', 'EDITORIAL_AUDIT.md')]

COLLECTION = {
    'README.md': 'COLLECTION_README.md',
    **{name: name for name in (
        'BROWSE_BY_TOPIC.html', 'QUALITY_REPORT.json', 'TOPIC_LESSON_INDEX.json',
        'COVERAGE_REPORT.md', 'COVERAGE_AUDIT.json', 'CONVERSATIONAL_EXPRESSION_REVIEW.txt',
        'SOURCE_COVERAGE_CROSSWALK.txt', 'REGIONAL_EXPRESSION_MARKERS.json',
        'GRAMMAR_DEDUP_AUDIT.json', 'LINGUISTIC_REVIEW_v1.1.4.md',
    )},
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
    require(preserved_progress(new, current), f'{context}: checkpoint identities changed')
    for section in ('practice',):
        old_ids = [q['id'] for q in current['sections'][section]['questions']]
        new_ids = [q['id'] for q in new['sections'][section]['questions']]
        require(new_ids == old_ids, f'{context}: question IDs/order changed')


def preserved_progress(new, current):
    """Allow supplied additive checkpoints; preserve old IDs, targets, flags and order."""
    new_mode, new_sections = progress_identity(new)
    old_mode, old_sections = progress_identity(current)
    if new_mode != old_mode:
        return False
    old_ids = {s[0] for s in old_sections}
    projected = []
    for sid, key, checkpoints in new_sections:
        if sid not in old_ids:
            continue
        old_cids = {c[0] for old_sid, _, cps in old_sections if old_sid == sid for c in cps}
        projected.append((sid, key, [c for c in checkpoints if c[0] in old_cids]))
    return projected == old_sections


def check_curriculum_extension(new, current):
    """Keep existing placement identities/order while accepting two appended units."""
    new_id, new_edition, new_schema, new_topics, new_sections = curriculum_identity(new)
    old_id, old_edition, old_schema, old_topics, old_sections = curriculum_identity(current)
    require((new_id, new_edition, new_schema) == (old_id, old_edition, old_schema),
            'Conversational curriculum identity changed')
    require(new_topics[:len(old_topics)] == old_topics, 'Existing course topic identities changed')
    require(len(new_sections) == len(old_sections), 'Existing curriculum sections changed')
    for ns, os in zip(new_sections, old_sections):
        require(ns[:3] == os[:3] and ns[3][:len(os[3])] == os[3],
                'Existing curriculum placements/identities changed')
    placements = [p for s in new['sections'] for u in s['units'] for p in u['placements']]
    require(len(placements) == 17 and {p['lesson_id'] for p in placements} == {
        p['lesson_id'] for s in current['sections'] for u in s['units'] for p in u['placements']
    } | set(NEW_LESSONS.values()), 'Expected the original placements plus two supplied lessons')


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


def check_collection(package, replacements):
    """Check supplied indexes/sidecars without deriving lexical or regional identity."""
    prefix = 'conversational_mandarin/'
    known = {ident for ident in replacements if ident.startswith('convm-')}
    index = json.loads(package[prefix + 'TOPIC_LESSON_INDEX.json'])['lessons']
    require(len(index) == 17 and {item['lesson_id'] for item in index} == known,
            'Topic index does not match the 17 supplied lessons')
    for item in index:
        doc = replacements[item['lesson_id']]
        require(item['title'] == doc['lesson']['title'], f"{item['lesson_id']}: index title differs")
    counts = [counts_of(doc) for ident, doc in replacements.items() if ident in known]
    quality = json.loads(package[prefix + 'QUALITY_REPORT.json'])
    require(quality['lesson_count'] == len(known)
            and quality['required_checkpoints'] == sum(c['required'] for c in counts)
            and quality['optional_checkpoints'] == sum(c['optional'] for c in counts),
            'Supplied quality-report lesson/checkpoint totals differ')
    inventories = {}
    for name, expected in [('CONVERSATIONAL_EXPRESSION_REVIEW.txt', 441), ('SOURCE_COVERAGE_CROSSWALK.txt', 296)]:
        lines = [line for line in package[prefix + name].decode('utf-8').splitlines() if not line.startswith('#')]
        rows = list(csv.DictReader(lines, delimiter='\t'))
        require(len(rows) == expected and len({row['ID'] for row in rows}) == expected,
                f'{name}: unexpected count or duplicate permanent IDs')
        for row in rows:
            require(set(filter(None, row['LESSON_IDS'].split(','))) <= known,
                    f"{name}/{row['ID']}: unknown lesson reference")
        inventories[name] = {row['ID']: row for row in rows}
    expressions = inventories['CONVERSATIONAL_EXPRESSION_REVIEW.txt']
    markers = json.loads(package[prefix + 'REGIONAL_EXPRESSION_MARKERS.json'])['expressions']
    require(len(markers) == 49 and len({m['expression_id'] for m in markers}) == 49,
            'Expected 49 distinct supplied regional markers')
    for marker in markers:
        row = expressions.get(marker['expression_id'])
        require(row is not None and marker['hanzi'] == row['HANZI'] and marker['pinyin'] == row['PINYIN']
                and set(marker['lesson_ids']) <= known, f"{marker['expression_id']}: inconsistent regional marker")
    return {'expressions': len(expressions), 'sourceCrosswalk': 296, 'regionalMarkers': len(markers),
            'requiredCheckpoints': quality['required_checkpoints'], 'optionalCheckpoints': quality['optional_checkpoints']}


def audit():
    sources = {}
    for path, expected in PINS.items():
        actual = sha(path.read_bytes())
        require(actual == expected, f'{path.name}: source checksum mismatch')
        sources[path.relative_to(ROOT).as_posix()] = actual
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
    for prefix, target, expected_count in [('conversational_mandarin/topics/', 'conversational', 17),
                                            ('independent/', 'independent', 2)]:
        members = sorted(n for n in package if n.startswith(prefix) and n.endswith('.zip'))
        require(len(members) == expected_count, f'{prefix}: wrong lesson count')
        expected_members.update(members)
        existing = {p.name for p in (LESSONS / target).iterdir() if p.is_dir() and '_LESSON_' in p.name}
        incoming = {PurePosixPath(n).stem for n in members}
        allowed = set(NEW_LESSONS) if target == 'conversational' else set()
        require(incoming == existing | allowed, f'{target}: replacement/addition set changed')
        for name in members:
            stem = PurePosixPath(name).stem
            directory = LESSONS / target / stem
            files = read_zip(package[name])
            require(set(files) == {f'{stem}.json', f'{stem}.html', f'{stem}.md', 'report.md'},
                    f'{stem}: expected exactly four root lesson files')
            doc = json.loads(files[f'{stem}.json'])
            current_path = directory / f'{stem}.json'
            current = json.loads(current_path.read_bytes()) if current_path.exists() else None
            if current is not None:
                check_identity(doc, current, name)
            else:
                require(NEW_LESSONS.get(stem) == doc['lesson_id'], f'{stem}: unexpected new lesson identity')
            require(doc['lesson_id'] not in replacements, f'{stem}: duplicate lesson ID')
            if target == 'independent':
                require(doc == current, f'{stem}: character lesson content changed')
            replacements[doc['lesson_id']] = doc
            writes.update({directory / n: raw for n, raw in files.items()})
            lesson_report[doc['lesson_id']] = {
                'directory': directory.relative_to(ROOT).as_posix(), 'nested_sha256': sha(package[name]),
                'files': {n: sha(raw) for n, raw in files.items()},
                'checkpointIdentitiesPreserved': current is None or preserved_progress(doc, current),
                'newLesson': current is None, 'contentChanged': doc != current,
                **counts_of(doc),
            }
    require(set(package) == expected_members, 'Unexpected Other Lessons package members')
    collection_report = check_collection(package, replacements)
    course_path = LESSONS / 'curricula/CONVERSATIONAL_MANDARIN.json'
    course_raw = package['curricula/CONVERSATIONAL_MANDARIN.json']
    course = json.loads(course_raw)
    check_curriculum_extension(course, json.loads(course_path.read_bytes()))
    writes[course_path] = course_raw
    for name, destination in COLLECTION.items():
        writes[LESSONS / 'conversational' / destination] = package[f'conversational_mandarin/{name}']
    writes[LESSONS / 'conversational/PACKAGE_README.md'] = package['README.md']
    # Validate all retained lessons with the incoming schemas, not only replacements.
    entries = read_vocabulary()['entries']
    with tempfile.TemporaryDirectory(prefix='mandarin-core-332-') as tmp:
        staging = Path(tmp)
        for name, raw in core_files.items():
            (staging / name).write_bytes(raw)
        spec = importlib.util.spec_from_file_location('core_332_validation', CORE / 'validate_core.py')
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        validator.HERE = staging
        with contextlib.redirect_stdout(io.StringIO()):
            validator.run_test()
        catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
        active, word_count, replacement_word_count = {}, 0, 0
        paths = set(LESSONS.rglob('*_LESSON_*/*.json')) | {p for p in writes if p.suffix == '.json' and '_LESSON_' in p.parent.name}
        for path in sorted(paths):
            if 'legacy' in path.relative_to(LESSONS).parts:
                continue
            doc = json.loads(writes[path] if path in writes else path.read_bytes())
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
        require(len(active) == 65, 'Expected 65 active lessons')
        curriculum_paths = sorted((LESSONS / 'curricula').glob('*.json'))
        for path in curriculum_paths:
            doc = json.loads(writes[path] if path in writes else path.read_bytes())
            validator.checks_curriculum(doc)
            placed = [p for s in doc['sections'] for u in s['units'] for p in u['placements']]
            require(all(p['lesson_id'] in active and all(i in active for i in p['prerequisite_lesson_ids'])
                        for p in placed), f'{path.name}: unresolved placement/prerequisite')
    counts = {ident: counts_of(doc) for ident, doc in active.items()}
    writes[LESSONS / 'lesson-cards.json'] = cards_document(counts)
    report = {
        'sources': sources, 'core': {'files': {n: sha(raw) for n, raw in core_files.items()},
                                   'schemaAndTaxonomyBytesUnchanged': True, 'templatesValidated': 8},
        'lessons': lesson_report, 'collection': collection_report,
        'collectionFiles': {name: sha(package[f'conversational_mandarin/{name}']) for name in COLLECTION},
        'checks': {'validatedActiveLessons': len(active), 'validatedCurricula': len(curriculum_paths),
                   'exactHskWordBindingsMatched': word_count,
                   'replacementHskWordBindings': replacement_word_count,
                   'unlinkedExpressions': 'Preserved as supplied; no HSK identity or dictionary match inferred.',
                   'curriculumPlacementsPreserved': True, 'runtimeVocabularyUntouched': True,
                   'hskLessonsUntouched': True, 'sourceContentRewritten': False},
        'obsoleteFilesRemoved': [p.relative_to(ROOT).as_posix() for p in OBSOLETE if p.exists()],
        'outputFilesChanged': [p.relative_to(ROOT).as_posix() for p, raw in writes.items()
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
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(raw)
        for path in OBSOLETE:
            path.unlink(missing_ok=True)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"20 Core files; 19 lessons checked; {report['checks']['validatedActiveLessons']} active lessons valid; "
          f"{len(report['outputFilesChanged'])} files {'written' if args.write else 'would change'}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, zipfile.BadZipFile) as err:
        print(f'INVALID: {err}', file=sys.stderr)
        sys.exit(1)
