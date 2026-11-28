#!/usr/bin/env python3
"""Validate and import the HSK Level 3 lesson package (35 lessons, 500 words).

Audit by default; --write applies only after the complete handoff passes.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'src/data/study_lessons/core'
LESSONS = CORE.parent / 'lessons'
SOURCES = ROOT / 'importer/data/lessons'

spec_h = importlib.util.spec_from_file_location('release_helpers', Path(__file__).with_name('import-lessons-v3.4.0.py'))
h = importlib.util.module_from_spec(spec_h)
spec_h.loader.exec_module(h)
spec_labels = importlib.util.spec_from_file_location('current_labels', Path(__file__).with_name('reconcile-lesson-hsk-labels.py'))
labels = importlib.util.module_from_spec(spec_labels)
spec_labels.loader.exec_module(labels)

sys.path.insert(0, str(CORE))
import validate_core

LEVEL3_ZIP = 'Mandarin_HSK_Level3_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.3.zip'
LEVEL3_SHA = '7d790b8e396792f7b0fa6221a1c6994abb79ad73ddc0ce7bf50950255778225b'


def current_references(doc, entries):
    """Resolve a source reference only through its exact current/recorded tuple.

    This is offline source normalization, never a browser compatibility map.
    The supplied Level 3 package includes some reviewed lower-level old IDs.
    """
    result = copy.deepcopy(doc)
    by_id = {e['hsk_index']: e for e in entries if e.get('hsk_index')}
    previous = {}
    names = {e.get('studyMetadata', {}).get('source', {}).get('sourceName') for e in entries}
    for name in filter(None, names):
        path = ROOT / 'importer/hsk' / name
        if not path.is_file():
            continue
        for entry in json.loads(path.read_bytes()).get('entries', []):
            if 'legacy_syllabus_id' in entry:
                previous[entry['legacy_syllabus_id']] = entry['id']
    changes = []
    for item in validate_core.each_dict(result):
        for ref in item.get('syllabus_refs', []):
            number = ref['entry_id']
            current = by_id.get(number)
            if current and (current['simplified'], current['pinyinDisplay']) == (item['hanzi'], item['pinyin']):
                continue
            target = by_id.get(previous.get(number))
            h.require(target and (target['simplified'], target['pinyinDisplay']) == (item['hanzi'], item['pinyin']),
                      f'{doc["lesson_id"]}: source ID/headword/reading requires review: {number}')
            ref['entry_id'] = target['hsk_index']
            changes.append({'lesson': doc['lesson_id'], 'headword': item['hanzi'], 'sourceId': number, 'currentId': ref['entry_id']})
    return result, changes, previous


def audit():
    zip_path = SOURCES / LEVEL3_ZIP
    raw = zip_path.read_bytes()
    h.require(h.sha(raw) == LEVEL3_SHA, f'{LEVEL3_ZIP}: source checksum mismatch')
    pkg = h.read_zip(raw)

    entries = h.read_vocabulary()['entries']
    catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']

    members = sorted(n for n in pkg if n.startswith('hsk3/level3/') and n.endswith('.zip'))
    h.require(len(members) == 35, f'Expected 35 Level 3 lesson ZIPs, found {len(members)}')

    writes = {}
    docs = {}
    bindings = 0
    pattern_total = 0
    introduced_ids = set()
    lesson_report = {}
    reference_changes = []

    for member in members:
        stem = Path(member).stem
        directory = LESSONS / 'hsk3/level3' / stem
        files = h.read_zip(pkg[member])
        h.require(set(files) == {stem + '.json', stem + '.html', stem + '.md', 'report.md'}, f'{stem}: four-file contract failed')
        doc = json.loads(files[stem + '.json'])
        doc, changes, previous = current_references(doc, entries)
        reference_changes.extend(changes)
        h.require(doc['schema_version'] == 'mandarin-topic-lesson/3.4.0', f'{stem}: expected mandarin-topic-lesson/3.4.0')

        validate_core.checks_lesson(doc, catalog)
        bindings += h.check_words(doc, entries, validate_core.each_dict)

        for item in doc['sections']['vocabulary']['items']:
            if item['learning_role'] == 'introduced':
                for ref in item['syllabus_refs']:
                    eid = ref['entry_id']
                    h.require(501 <= eid <= 1000, f'{stem}: introduced entry_id {eid} not in HSK 3 (501-1000)')
                    h.require(eid not in introduced_ids, f'{stem}: duplicate introduced entry_id {eid}')
                    introduced_ids.add(eid)

        rows = doc['sections']['teaching_plan']['patterns']
        h.require(all(p.get('pattern_hanzi') and p.get('pattern_pinyin') and p.get('pattern_pseudo_translation') for p in rows),
                  f'{stem}: incomplete three-line pattern')
        pattern_total += len(rows)
        h.require(doc['lesson_id'] not in docs, f'Duplicate lesson_id {doc["lesson_id"]}')
        docs[doc['lesson_id']] = doc
        writes.update({directory / name: data for name, data in files.items()})
        if changes:
            writes[directory / (stem + '.json')] = (json.dumps(doc, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        lesson_report[doc['lesson_id']] = {
            'directory': directory.relative_to(ROOT).as_posix(),
            'schema_version': doc['schema_version'],
            'nestedSha256': h.sha(pkg[member]),
            'files': {name: h.sha(data) for name, data in files.items()},
            'patterns': len(rows),
        }

    h.require(introduced_ids == set(range(501, 1001)), f'Expected all 500 HSK 3 IDs (501-1000), got {len(introduced_ids)}')

    curr_raw = pkg['curricula/HSK3_2025_LEVEL1_LEVEL2_LEVEL3.json']
    curr_doc = json.loads(curr_raw)
    validate_core.checks_curriculum(curr_doc)
    l3_sections = [s for s in curr_doc['sections'] if s.get('section_id') == 'hsk3-level-3']
    h.require(len(l3_sections) == 1, 'Expected hsk3-level-3 section in curriculum')
    l3_placements = [p for u in l3_sections[0]['units'] for p in u['placements']]
    h.require({p['lesson_id'] for p in l3_placements} == set(docs), 'Curriculum Level 3 placements do not match 35 lessons')
    # Validate all levels before writing a combined curriculum: historical
    # placement numbers must never be reintroduced beside current lesson JSON.
    retained = {json.loads(p.read_bytes())['lesson_id']: json.loads(p.read_bytes())
                for p in LESSONS.rglob('*_LESSON_*/*.json') if 'legacy' not in p.relative_to(LESSONS).parts}
    retained.update(docs)
    for section in curr_doc['sections']:
        for unit in section['units']:
            for placement in unit['placements']:
                lesson = retained[placement['lesson_id']]
                items = lesson.get('sections', {}).get('vocabulary', {}).get('items', [])
                for role in ('introduced', 'reviewed'):
                    expected = {r['entry_id'] for item in items if item.get('learning_role') == role
                                for r in item.get('syllabus_refs', []) if r['curriculum_id'] == curr_doc['curriculum_id']}
                    key = f'{role}_syllabus_entry_ids'
                    mapped = [previous.get(i, i) for i in placement[key]]
                    if set(mapped) == expected:
                        placement[key] = mapped
                    h.require(set(placement[key]) == expected,
                              f'{placement["lesson_id"]}: non-current {role} curriculum IDs')
    writes[LESSONS / 'curricula/HSK3_2025_LEVEL1.json'] = (json.dumps(curr_doc, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    writes[LESSONS / 'hsk3/level3/PACKAGE_README.md'] = pkg['README.md']

    existing_cards = json.loads((LESSONS / 'lesson-cards.json').read_bytes())['lessons']
    for ident, doc in docs.items():
        existing_cards[ident] = h.counts_of(doc)
    writes[LESSONS / 'lesson-cards.json'] = h.cards_document(existing_cards)

    normalized = []
    for path, raw in list(writes.items()):
        if path.suffix not in ('.md', '.html') or path.stem not in {p.stem for p in writes if p.suffix == '.json'}:
            continue
        doc = json.loads(writes[path.with_suffix('.json')])
        items = doc.get('sections', {}).get('vocabulary', {}).get('items', [])
        updated = labels.normalize_companion(raw.decode('utf-8'), path.suffix, items, path).encode('utf-8')
        if updated != raw:
            normalized.append(path.relative_to(ROOT).as_posix())
        writes[path] = updated

    report = {
        'source': {'file': LEVEL3_ZIP, 'sha256': LEVEL3_SHA},
        'checks': {
            'level3LessonsValidated': len(docs),
            'introducedHsk3Entries': len(introduced_ids),
            'exactHskWordBindingsMatched': bindings,
            'threeLinePatterns': pattern_total,
            'curriculumValidated': True,
            'currentOfficialIdsOnly': True,
        },
        'normalizedCompanionLabels': normalized,
        'sourceReferenceNormalizations': reference_changes,
        'lessons': lesson_report,
    }
    return report, writes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true', help='Write validated Level 3 files into src/data/study_lessons/')
    ap.add_argument('--report', type=Path, help='Write JSON audit report to this path')
    args = ap.parse_args()
    report, writes = audit()
    if args.write:
        for path, data in writes.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['checks'], indent=2))


if __name__ == '__main__':
    main()
