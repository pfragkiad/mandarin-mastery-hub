#!/usr/bin/env python3
"""Audit/import the owner's v3.3.0 lesson handoff (checkpoint progress contract).

Inputs (preserved byte-for-byte under importer/data/lessons/):
  Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0.zip   19 canonical Core files
  Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0.zip     21 HSK Level 1 topic lessons
  Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0.zip          15 conversational + 2 character lessons

The handoff adds checkpoint progress (`progress`), `estimated_minutes`, direct IDs on guided
substitutions / reading questions and (two lessons) explicit empty subtopics. It was generated
from an older lesson base, so some learner content regressed. This importer therefore keeps the
CURRENT lesson JSON as the content source and takes from the handoff only the additive v3.3
fields. It fails unless, after stripping those fields, the only remaining differences are the
known regressions (word-card examples, practice questions, catalog_character_refs), each of
which keeps its current value. Curriculum manifests keep their current learner-facing copy
(the handoff reverted descriptions); everything else in them must be identical.
Companion HTML/Markdown/report.md files are copied as supplied (the app never reads them).
Also writes lessons/lesson-cards.json (required/optional checkpoint totals and estimated_minutes
per lesson), the small eager sidecar the lessons index uses for "25 min · 18 tasks".

  python scripts/import-lessons-v3.3.py            # audit only
  python scripts/import-lessons-v3.3.py --write    # apply + report
"""
import argparse, copy, hashlib, importlib.util, io, json, sys, zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'importer/data/lessons'
LIB = ROOT / 'src/data/study_lessons'
LESSONS = LIB / 'lessons'
CORE = LIB / 'core'
PACKAGES = {
    'core': SRC / 'Mandarin_Core_Project_Sources_v3.3.0_taxonomy-v2.0.0_rev2.zip',  # rev2: guidance only, schemas unchanged
    # Corrected owner release synced to vocabulary v1.7.1 (supersedes the first v3.3.0 HSK ZIP,
    # which was built from vocab v1.7.0 and kept only for the regression record).
    'hsk': SRC / 'Mandarin_HSK_Level1_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.7.1_rev2.zip',  # rev2: catalog refs repaired
    'other': SRC / 'Mandarin_Other_Lessons_v3.3.0_taxonomy-v2.0.0_rev2.zip',  # rev2: learner-facing intros/labels
}
# Nested lesson ZIP prefix in each package → current runtime directory.
PLACES = {('hsk', 'hsk3/level1/'): 'hsk3/level1', ('other', 'independent/'): 'independent',
          ('other', 'conversational_mandarin/topics/'): 'conversational'}
REVERTED_OK = ('catalog_character_refs',)


def sha(raw): return hashlib.sha256(raw).hexdigest()
def require(ok, msg):
    if not ok: raise ValueError(msg)


def strip_additions(doc):
    """The lesson minus every field v3.3 adds, for the content-equality check."""
    d = copy.deepcopy(doc)
    for k in ('schema_version', 'estimated_minutes', 'progress'): d.pop(k, None)
    d.get('metadata', {}).pop('template_version', None)
    cls = d.get('classification') or {}
    if cls.get('subtopic_ids') == [] and cls.get('primary_subtopic_id') is None and 'subtopic_ids' in cls:
        cls.pop('subtopic_ids'); cls.pop('primary_subtopic_id', None)
    plan = d.get('sections', {}).get('teaching_plan')
    if plan:
        for x in plan['guided_building']['substitutions']: x.pop('id', None)
        for x in plan['reading']['questions']: x.pop('id', None)
    return d


def merge(new, cur, log):
    """New key order and v3.3 fields; current learner content wherever the handoff regressed."""
    out = copy.deepcopy(new)
    if 'catalog_character_refs' in cur and out.get('catalog_character_refs') != cur['catalog_character_refs']:
        log.append('catalog_character_refs kept'); out['catalog_character_refs'] = cur['catalog_character_refs']
    sec, csec = out.get('sections', {}), cur.get('sections', {})
    if 'vocabulary' in sec and 'items' in sec['vocabulary']:
        old = {i['id']: i for i in csec['vocabulary']['items']}
        for item in sec['vocabulary']['items']:
            if item.get('examples') != old[item['id']].get('examples'):
                log.append(f"examples kept: {item['id']} {item['hanzi']}"); item['examples'] = old[item['id']]['examples']
    if 'practice' in sec:
        old = {q['id']: q for q in csec['practice']['questions']}
        require(list(old) == [q['id'] for q in sec['practice']['questions']], 'practice question IDs/order changed')
        for i, q in enumerate(sec['practice']['questions']):
            if q != old[q['id']]:
                log.append(f"question kept: {q['id']}"); sec['practice']['questions'][i] = old[q['id']]
    require(strip_additions(out) == strip_additions(cur), 'Unexpected content difference beyond the known regressions')
    return out


def synced(new, cur, catalog, log):
    """A source-synced lesson (its word examples equal the current word-card examples): the
    package's content wins (refreshed questions and checkpoint labels included). Only
    catalog_character_refs it lacks for characters its own learner text uses are added back
    from the current file, each still checked against catalog_ids.json by checks_lesson."""
    out = copy.deepcopy(new)
    refs = out.setdefault('catalog_character_refs', {})
    for ch, ident in (cur.get('catalog_character_refs') or {}).items():
        if ch not in refs and ch in json.dumps(strip_refs(out), ensure_ascii=False):
            refs[ch] = ident; log.append(f'catalog ref added back: {ch}')
    out['catalog_character_refs'] = dict(sorted(refs.items(), key=lambda kv: list(cur.get('catalog_character_refs', {})).index(kv[0]) if kv[0] in cur.get('catalog_character_refs', {}) else 10**6))
    return out


def strip_refs(doc):
    d = dict(doc); d.pop('catalog_character_refs', None); return d


def examples_of(doc):
    return {i['id']: i.get('examples') for i in doc.get('sections', {}).get('vocabulary', {}).get('items', [])}


def lesson_members(key, package):
    for (pkg, prefix), target in PLACES.items():
        if pkg != key: continue
        for name in package.namelist():
            if name.startswith(prefix) and name.endswith('.zip') and name.count('/') == prefix.count('/'):
                yield name, Path(name).stem, LESSONS / target / Path(name).stem


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--write', action='store_true'); args = ap.parse_args()
    report = {'sources': {k: {'file': str(p.relative_to(ROOT)), 'sha256': sha(p.read_bytes())} for k, p in PACKAGES.items()},
              'lessons': {}, 'curricula': {}, 'core': {}}
    writes = {}
    # Core: 19 canonical files, validated by their own schemas below.
    with zipfile.ZipFile(PACKAGES['core']) as z:
        require(z.testzip() is None and len(z.namelist()) == 19, 'Expected 19 Core files')
        for n in z.namelist(): writes[CORE / n] = z.read(n)
    report['core'] = {'files': 19, 'removed': ['CURRICULUM_PIMSLEUR_TEMPLATE.json']}
    # Validator from the NEW core schemas (loaded from the package bytes via a temp copy).
    import tempfile, shutil
    tmp = Path(tempfile.mkdtemp())
    shutil.copy(CORE / 'validate_core.py', tmp / 'validate_core.py')
    for path, raw in writes.items(): (tmp / path.name).write_bytes(raw)
    spec = importlib.util.spec_from_file_location('v', tmp / 'validate_core.py'); v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
    catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    counts = {}
    for key in ('hsk', 'other'):
        with zipfile.ZipFile(PACKAGES[key]) as z:
            require(z.testzip() is None, f'{key} CRC mismatch')
            members = list(lesson_members(key, z))
            require(len(members) == (21 if key == 'hsk' else 17), f'{key}: unexpected lesson count {len(members)}')
            for name, stem, directory in members:
                require(directory.is_dir(), f'{stem}: no current lesson directory to update')
                with zipfile.ZipFile(io.BytesIO(z.read(name))) as nz:
                    want = {stem + '.json', stem + '.html', stem + '.md', 'report.md'}
                    require(set(nz.namelist()) == want and nz.testzip() is None, f'{stem}: expected its four files')
                    new = json.loads(nz.read(stem + '.json'))
                    cur = json.loads((directory / (stem + '.json')).read_bytes())
                    require(new['lesson_id'] == cur['lesson_id'], f'{stem}: lesson ID changed')
                    log = []
                    # Source-synced lessons win; a lesson whose word examples regressed keeps
                    # the current learner content (merge) — see the regression report.
                    merged = synced(new, cur, catalog, log) if examples_of(new) == examples_of(cur) else merge(new, cur, log)
                    v.checks_lesson(merged, catalog)
                    cps = [c for s in merged['progress']['sections'] for c in s['checkpoints']]
                    counts[merged['lesson_id']] = {'required': sum(not c['optional'] for c in cps), 'optional': sum(c['optional'] for c in cps), 'estimated_minutes': merged.get('estimated_minutes')}
                    writes[directory / (stem + '.json')] = (json.dumps(merged, ensure_ascii=False, indent=2) + '\n').encode()
                    for f in (stem + '.html', stem + '.md', 'report.md'): writes[directory / f] = nz.read(f)
                    report['lessons'][merged['lesson_id']] = {'directory': str(directory.relative_to(ROOT)), 'schema_version': merged['schema_version'],
                        'nested_sha256': sha(z.read(name)), 'required': counts[merged['lesson_id']]['required'], 'optional': counts[merged['lesson_id']]['optional'], 'kept_current': log}
            # Curricula: identical except reverted learner-facing copy, which stays current.
            for name in z.namelist():
                if not (name.startswith('curricula/') and name.endswith('.json')): continue
                new = json.loads(z.read(name)); path = LESSONS / 'curricula' / Path(name).name
                cur = json.loads(path.read_bytes())
                differ = sorted(k for k in set(new) | set(cur) if new.get(k) != cur.get(k))
                require(set(differ) <= {'description', 'edition'}, f'{name}: unexpected curriculum change {differ}')
                # Corrected releases rewrote descriptions for learners; take them. The first
                # handoff's reverted developer copy stays rejected.
                take = 'Later levels' not in new.get('description', '') and 'not reproduced' not in new.get('description', '')
                v.checks_curriculum(new if take else cur)
                if take and differ: writes[path] = z.read(name)
                report['curricula'][path.name] = {'taken_from_package' if take else 'kept_current': differ}
    counts = dict(sorted(counts.items()))
    writes[LESSONS / 'lesson-cards.json'] = (json.dumps({'note': 'Generated by scripts/import-lessons-v3.3.py from each lesson\'s progress.sections and estimated_minutes; do not edit.', 'lessons': counts}, ensure_ascii=False, indent=2) + '\n').encode()
    req = sum(c['required'] for c in counts.values()); opt = sum(c['optional'] for c in counts.values())
    report['totals'] = {'lessons': len(counts), 'required_checkpoints': req, 'optional_checkpoints': opt}
    print(f"{len(counts)} lessons valid · {req} required / {opt} optional checkpoints")
    print('kept current:', sum(len(x['kept_current']) for x in report['lessons'].values()), 'items;', report['curricula'])
    require(req == 549 and opt == 64, 'Checkpoint totals differ from the supplied migration report (549/64)')
    if args.write:
        for path, raw in writes.items(): path.write_bytes(raw)
        (CORE / 'CURRICULUM_PIMSLEUR_TEMPLATE.json').unlink(missing_ok=True)
        (ROOT / 'reports/lessons-3.3.0-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('written', len(writes), 'files')


if __name__ == '__main__':
    try: main()
    except ValueError as e: print('INVALID:', e, file=sys.stderr); sys.exit(1)
