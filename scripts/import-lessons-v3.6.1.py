#!/usr/bin/env python3
"""Validate and copy the supplied Core/HSK v3.6.1 and Other Lessons v3.6.0 handoff.

Audit by default; --write applies only after the complete handoff passes. Lesson
content and companions come directly from the pinned ZIP bytes, never generated.
"""
import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'src/data/study_lessons/core'
LESSONS = CORE.parent / 'lessons'
SOURCES = ROOT / 'importer/data/lessons'
spec = importlib.util.spec_from_file_location('release_helpers', Path(__file__).with_name('import-lessons-v3.4.0.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
PACKAGES = {
    'core': ('Mandarin_Core_Project_Sources_v3.6.1_taxonomy-v2.0.0.zip', '4b9009ed9092cba766eaf69b5051498b05ac9f9b6e366753c8d2263a89cae667'),
    'level1': ('Mandarin_HSK_Level1_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.7.1.zip', 'e07e82bad82e0a2cd58e652b5cd669456d5188c0641b9802f426b41fed08e571'),
    'level2': ('Mandarin_HSK_Level2_Lessons_v3.6.1_taxonomy-v2.0.0_vocab-v1.1.1.zip', '0809cbf7c793d7f2b1deca8aeb25db040e09cef929462661437555b623ae66f4'),
    'other': ('Mandarin_Other_Lessons_v3.6.0_taxonomy-v2.0.0.zip', 'e54d1a81c68d7c23b2e3287530c00d4f3e6fa80ccad85ba27d031bf29142b636'),
}
PLACES = [('level1', 'hsk3/level1/', 'hsk3/level1', 21),
          ('level2', 'hsk3/level2/', 'hsk3/level2', 25),
          ('other', 'conversational_mandarin/topics/', 'conversational', 17),
          ('other', 'independent/', 'independent', 2)]


def updated_validator(raw):
    """Extend existing semantic guards to topic/general 3.4; never bypass a guard."""
    text = raw.decode('utf-8')
    old = "('mandarin-topic-lesson/3.1.0','mandarin-topic-lesson/3.2.0','mandarin-topic-lesson/3.3.0')"
    new = old[:-1] + ",'mandarin-topic-lesson/3.4.0')"
    text = text.replace(old, new)
    text = text.replace("('/3.0.0','/3.1.0','/3.2.0','/3.3.0')", "('/3.0.0','/3.1.0','/3.2.0','/3.3.0','/3.4.0')")
    h.require(new in text, 'Topic 3.4 semantic validation is not enabled')
    return text.encode('utf-8')


def check_identity(doc, current):
    context = doc['lesson_id']
    h.require(context == current['lesson_id'], f'{context}: lesson identity changed')
    h.require(h.progress_identity(doc) == h.progress_identity(current), f'{context}: checkpoint identities changed')
    h.require([q['id'] for q in doc['sections']['practice']['questions']] ==
              [q['id'] for q in current['sections']['practice']['questions']], f'{context}: question IDs changed')
    family = doc['schema_version'].split('/')[0]
    h.require(family == current['schema_version'].split('/')[0], f'{context}: lesson family changed')
    expected = '3.2.0' if family == 'mandarin-character-lesson' else '3.4.0'
    h.require(doc['schema_version'] == f'{family}/{expected}', f'{context}: unexpected schema version')


def patterns(doc):
    """Read each family's own recorded patterns without remapping their content."""
    sections = doc['sections']
    if doc['schema_version'].startswith('mandarin-topic-lesson/'):
        return sections['teaching_plan']['patterns']
    if doc['schema_version'].startswith('mandarin-general-lesson/'):
        return [b for b in sections['blocks'] if b['kind'] == 'grammar_pattern']
    return sections['constructions']['items']


def audit():
    packages, source_report = {}, {}
    for key, (name, pin) in PACKAGES.items():
        raw = (SOURCES / name).read_bytes()
        h.require(h.sha(raw) == pin, f'{name}: source checksum mismatch')
        packages[key] = h.read_zip(raw)
        source_report[key] = {'file': name, 'sha256': pin}
    core_files = packages['core']
    h.require(len(core_files) == 20 and all('/' not in n and not n.endswith('.py') for n in core_files),
              'Expected 20 canonical root Core files')
    for name in ('lesson_common.schema.json', 'curriculum.schema.json', 'lesson_categories.schema.json', 'lesson_categories.json'):
        h.require(core_files[name] == (CORE / name).read_bytes(), f'{name}: shared contract changed unexpectedly')
    writes = {CORE / name: raw for name, raw in core_files.items()}
    writes[CORE / 'validate_core.py'] = updated_validator((CORE / 'validate_core.py').read_bytes())
    writes[CORE / '.gitattributes'] = ('# Preserve exact canonical Core bytes.\n.gitattributes -text\n'
        '*.md whitespace=-blank-at-eol\n' + ''.join(f'{n} -text\n' for n in sorted(core_files))).encode()
    report = {'sources': source_report, 'lessons': {}, 'checks': {}, 'coreFiles': {n: h.sha(raw) for n, raw in core_files.items()}}
    entries = h.read_vocabulary()['entries']
    catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    docs, bindings, pattern_totals = {}, 0, {}
    with tempfile.TemporaryDirectory(prefix='mandarin-361-') as tmp:
        stage = Path(tmp)
        for name, raw in core_files.items():
            (stage / name).write_bytes(raw)
        (stage / 'validate_core.py').write_bytes(writes[CORE / 'validate_core.py'])
        spec = importlib.util.spec_from_file_location('core361', stage / 'validate_core.py')
        validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(validator)
        with contextlib.redirect_stdout(io.StringIO()):
            validator.run_test()
        for pkg, prefix, target, count in PLACES:
            members = sorted(n for n in packages[pkg] if n.startswith(prefix) and n.endswith('.zip'))
            expected = {p.name for p in (LESSONS / target).iterdir() if p.is_dir() and '_LESSON_' in p.name}
            h.require(len(members) == count and {Path(n).stem for n in members} == expected,
                      f'{target}: replacement directory set changed')
            total = 0
            for member in members:
                stem = Path(member).stem
                directory = LESSONS / target / stem
                files = h.read_zip(packages[pkg][member])
                h.require(set(files) == {stem + '.json', stem + '.html', stem + '.md', 'report.md'}, f'{stem}: four-file contract failed')
                path = directory / (stem + '.json')
                doc, current = json.loads(files[stem + '.json']), json.loads(path.read_bytes())
                check_identity(doc, current)
                # The new schemas must accept the current library as well as the incoming one.
                validator.checks_lesson(current, catalog)
                validator.checks_lesson(doc, catalog)
                bindings += h.check_words(doc, entries, validator.each_dict)
                rows = patterns(doc)
                old_ids = [p['id'] for p in patterns(current)]
                h.require([p['id'] for p in rows] == old_ids, f'{stem}: pattern/construction IDs changed')
                h.require(all(p.get('pattern_hanzi') and p.get('pattern_pinyin') and p.get('pattern_pseudo_translation') for p in rows),
                          f'{stem}: incomplete supplied three-line pattern')
                total += len(rows)
                h.require(doc['lesson_id'] not in docs, 'Duplicate lesson ID')
                docs[doc['lesson_id']] = doc
                writes.update({directory / n: raw for n, raw in files.items()})
                report['lessons'][doc['lesson_id']] = {'directory': directory.relative_to(ROOT).as_posix(),
                    'schema_version': doc['schema_version'], 'nestedSha256': h.sha(packages[pkg][member]),
                    'files': {n: h.sha(raw) for n, raw in files.items()}, 'patterns': len(rows),
                    'checkpointIdentitiesPreserved': True}
            pattern_totals[target] = total
        h.require(len(docs) == 65, 'Expected 65 supplied lessons')
        h.require(pattern_totals == {'hsk3/level1': 42, 'hsk3/level2': 50, 'conversational': 43, 'independent': 11},
                  'Unexpected pattern/construction totals')
        for pkg, member, target in [('level2', 'curricula/HSK3_2025_LEVEL1_LEVEL2.json', 'HSK3_2025_LEVEL1.json'),
                                    ('other', 'curricula/CONVERSATIONAL_MANDARIN.json', 'CONVERSATIONAL_MANDARIN.json')]:
            raw = packages[pkg][member]
            doc = json.loads(raw)
            path = LESSONS / 'curricula' / target
            h.require(doc == json.loads(path.read_bytes()), f'{target}: curriculum changed')
            validator.checks_curriculum(doc)
            placements = [p for s in doc['sections'] for u in s['units'] for p in u['placements']]
            h.require(all(p['lesson_id'] in docs for p in placements), f'{target}: unresolved placement')
            writes[path] = raw
        standalone = json.loads(packages['level1']['curricula/HSK3_2025_LEVEL1.json'])
        validator.checks_curriculum(standalone)
        combined = json.loads(packages['level2']['curricula/HSK3_2025_LEVEL1_LEVEL2.json'])
        h.require(standalone['sections'] == combined['sections'][:1], 'Level 1 course section differs')
    report['collection'] = h.check_collection(packages['other'], docs)
    for name, destination in h.COLLECTION.items():
        writes[LESSONS / 'conversational' / destination] = packages['other'][f'conversational_mandarin/{name}']
    writes[LESSONS / 'conversational/PACKAGE_README.md'] = packages['other']['README.md']
    writes[LESSONS / 'hsk3/level1/PACKAGE_README.md'] = packages['level1']['README.md']
    writes[LESSONS / 'hsk3/level2/PACKAGE_README.md'] = packages['level2']['README.md']
    writes[LESSONS / 'lesson-cards.json'] = h.cards_document({ident: h.counts_of(doc) for ident, doc in docs.items()})
    report['checks'] = {'activeLessonsValidated': 65, 'legacyLessonsAcceptedByNewSchemas': 65,
        'exactHskWordBindingsMatched': bindings, 'patternsBySection': pattern_totals,
        'curriculaValidated': 2, 'standaloneLevel1SectionPreserved': True,
        'sourceContentRewritten': False, 'runtimeVocabularyUntouched': True,
        'schemaAndSemanticValidationPassed': True}
    report['outputFilesChanged'] = [p.relative_to(ROOT).as_posix() for p, raw in writes.items() if not p.exists() or p.read_bytes() != raw]
    return writes, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    writes, report = audit()
    if args.write:
        for path, raw in writes.items():
            if not path.exists() or path.read_bytes() != raw:
                path.write_bytes(raw)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"65 lessons; 146 three-line patterns; {report['checks']['exactHskWordBindingsMatched']} exact HSK bindings; "
          f"{len(report['outputFilesChanged'])} files {'written' if args.write else 'would change'}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError) as err:
        print(f'INVALID: {err}', file=sys.stderr)
        sys.exit(1)
