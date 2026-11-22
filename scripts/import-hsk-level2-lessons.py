#!/usr/bin/env python3
"""Audit/import the owner's standalone HSK 3.0 Level 2 topic-lesson packages.

Each package under importer/data/lessons/ (preserved byte-for-byte) is one four-file lesson
ZIP: <STEM>.json, <STEM>.html, <STEM>.md and report.md. The lesson JSON is imported exactly
as supplied after these checks (any failure stops before writing anything):
  * the Core v3.3 validator (schema, active taxonomy, subtopic parents, catalog refs,
    checkpoint IDs/targets, choice IDs) against public/data/catalog_ids.json;
  * every word-bank item names one exact runtime Vocabulary word by HSK 3.0 entry number AND
    headword, with identical pinyin, meaning and every example (hanzi/pinyin/English/style/
    register) — introduced words must be Level 2 records, reviewed words a lower level;
  * the lesson ID is new (or the same directory), so no other lesson is replaced.
The separate Level 2 course manifest (curricula/HSK3_2025_LEVEL2.json) is rebuilt from the
PLACEMENTS table below — introduced/reviewed entry IDs come from the lesson's own
learning_role, never from inference — and validated with the Core curriculum checks.
lessons/lesson-cards.json is regenerated from every runtime lesson (scripts/lesson_cards.py).

  python scripts/import-hsk-level2-lessons.py            # audit only
  python scripts/import-hsk-level2-lessons.py --write    # apply + reports/hsk-level2-lessons-import.json
"""
import argparse, hashlib, importlib.util, io, json, sys, zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from lesson_cards import card_counts, cards_document  # noqa: E402

SRC = ROOT / 'importer/data/lessons'
LESSONS = ROOT / 'src/data/study_lessons/lessons'
CORE = ROOT / 'src/data/study_lessons/core'
TARGET = LESSONS / 'hsk3/level2'
CURRICULUM = LESSONS / 'curricula/HSK3_2025_LEVEL2.json'
VOCAB = ROOT / 'src/data/vocabulary'

# Course order is the owner's to decide; each package is appended in this recorded order.
UNITS = [{'unit_id': 'hsk3-l2-u-01', 'title': 'Plans and Free Time', 'sequence': 1}]
PLACEMENTS = [
    {'package': 'TOPIC_LESSON_MAKING_PLANS_TOGETHER_HSK2_v3.3.0_taxonomy-v2.0.0_vocab-v1.1.1.zip',
     'stem': 'TOPIC_LESSON_MAKING_PLANS_TOGETHER', 'unit_id': 'hsk3-l2-u-01', 'prerequisites': []},
]
COURSE = {
    'schema_version': 'mandarin-curriculum/3.0.0', 'curriculum_id': 'hsk3-2025-level2',
    'title': 'HSK 3.0 (2025) — Level 2 Learning Path', 'kind': 'syllabus', 'language': 'zh-CN',
    'edition': '2025-11', 'status': 'draft',
    'description': 'Build on Level 1 with thematic lessons for the 200 HSK 3.0 Level 2 words. Each lesson combines conversation, grammar, reading, speaking, and review, and reviews the Level 1 words it uses. More lessons are on the way.',
}
SECTION = {'section_id': 'hsk3-l2', 'title': 'HSK 3.0 Level 2', 'sequence': 1, 'level_number': 2,
           'description': 'Thematic lessons for the HSK 3.0 Level 2 words.'}


def sha(raw): return hashlib.sha256(raw).hexdigest()
def require(ok, msg):
    if not ok: raise ValueError(msg)


def vocabulary():
    """Runtime words keyed by HSK 3.0 entry number (several records per number are kept apart)."""
    by = {}
    for f in sorted(VOCAB.glob('*.json')):
        if f.name == 'index.json': continue
        for e in json.loads(f.read_bytes()):
            if e.get('entryKind') == 'word' and e.get('hskVersion') == '3.0' and e.get('hsk_index') is not None:
                by.setdefault(e['hsk_index'], []).append(e)
    return by


def check_words(lesson, by):
    intro, review, n_ex = [], [], 0
    for item in lesson['sections']['vocabulary']['items']:
        refs = [r for r in item['syllabus_refs'] if r['curriculum_id'] == 'hsk3-2025']
        require(len(refs) == 1, f"{item['id']}: needs exactly one hsk3-2025 reference")
        eid = refs[0]['entry_id']
        hits = [e for e in by.get(eid, []) if e['simplified'] == item['hanzi']]
        require(len(hits) == 1, f"{item['id']}: no unique Vocabulary word #{eid} {item['hanzi']}")
        e = hits[0]
        require(e['pinyinDisplay'] == item['pinyin'], f"#{eid}: pinyin {item['pinyin']} ≠ {e['pinyinDisplay']}")
        require('; '.join(e['meanings']) == item['meaning_en'], f"#{eid}: meaning differs from the word card")
        want = [[x['simplified'], x['pinyinDisplay'], x['english'], x.get('style'), x.get('register')] for x in e.get('examples', [])]
        got = [[x['hanzi'], x['pinyin'], x['english'], x.get('style'), x.get('register')] for x in item['examples']]
        require(got == want, f"#{eid}: examples differ from the word card")
        n_ex += len(got)
        role = item['learning_role']
        require(role in ('introduced', 'reviewed'), f"#{eid}: unknown learning_role {role}")
        if role == 'introduced': require(e['hskLevel'] == 2, f"#{eid}: introduced word is not Level 2"); intro.append(eid)
        else: require(e['hskLevel'] < 2, f"#{eid}: reviewed word is not from an earlier level"); review.append(eid)
    return intro, review, n_ex


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--write', action='store_true'); args = ap.parse_args()
    spec = importlib.util.spec_from_file_location('v', CORE / 'validate_core.py'); v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
    catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    by = vocabulary()
    existing = {}
    for f in LESSONS.rglob('*_LESSON_*/*.json'):
        if 'legacy' in f.parts: continue
        existing.setdefault(json.loads(f.read_bytes())['lesson_id'], set()).add(f.parent)
    writes, report = {}, {'lessons': {}}
    units = {u['unit_id']: {**u, 'placements': []} for u in UNITS}
    topics = []
    for i, p in enumerate(PLACEMENTS, 1):
        path = SRC / p['package']; raw = path.read_bytes(); stem = p['stem']
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            want = {stem + '.json', stem + '.html', stem + '.md', 'report.md'}
            require(set(z.namelist()) == want and z.testzip() is None, f'{stem}: expected exactly its four files')
            lesson = json.loads(z.read(stem + '.json'))
            directory = TARGET / stem
            require(existing.get(lesson['lesson_id'], {directory}) == {directory}, f"{lesson['lesson_id']}: ID already used by another lesson")
            require(lesson['schema_version'] == 'mandarin-topic-lesson/3.3.0', f'{stem}: expected a v3.3.0 topic lesson')
            v.checks_lesson(lesson, catalog)
            intro, review, n_ex = check_words(lesson, by)
            for f in want: writes[directory / f] = z.read(f)
        cps = [c for s in lesson['progress']['sections'] for c in s['checkpoints']]
        for t in lesson['classification']['topic_ids']:
            if t not in topics: topics.append(t)
        units[p['unit_id']]['placements'].append({
            'placement_id': f'hsk3-l2-p-{i:02d}', 'lesson_id': lesson['lesson_id'],
            'sequence': len(units[p['unit_id']]['placements']) + 1, 'role': 'core',
            'prerequisite_lesson_ids': p['prerequisites'], 'course_topic_ids': lesson['classification']['topic_ids'],
            'introduced_syllabus_entry_ids': intro, 'reviewed_syllabus_entry_ids': review})
        report['lessons'][lesson['lesson_id']] = {
            'package': str(path.relative_to(ROOT)), 'sha256': sha(raw), 'directory': str(directory.relative_to(ROOT)),
            'introduced_entry_ids': intro, 'reviewed_entry_ids': review, 'examples_matched': n_ex,
            'catalog_character_refs': len(lesson.get('catalog_character_refs') or {}),
            'required_checkpoints': sum(not c['optional'] for c in cps), 'optional_checkpoints': sum(c['optional'] for c in cps)}
    registry = {c['id']: c for c in json.loads((CORE / 'lesson_categories.json').read_bytes())['categories']}
    course = {**COURSE, 'course_topics': [{'id': t, 'label': registry[t]['label'], 'global_topic_ids': [t]} for t in topics],
              'sections': [{**SECTION, 'units': list(units.values())}]}
    v.checks_curriculum(course)
    writes[CURRICULUM] = (json.dumps(course, ensure_ascii=False, indent=1) + '\n').encode()
    # Lesson cards come from every runtime lesson plus the lessons written now.
    counts = card_counts(LESSONS)
    for path, raw in writes.items():
        if path.suffix == '.json' and path.parent.parent == TARGET:
            doc = json.loads(raw); cps = [c for s in doc['progress']['sections'] for c in s['checkpoints']]
            counts[doc['lesson_id']] = {'required': sum(not c['optional'] for c in cps), 'optional': sum(c['optional'] for c in cps), 'estimated_minutes': doc.get('estimated_minutes')}
    writes[LESSONS / 'lesson-cards.json'] = cards_document(counts)
    for lid, r in report['lessons'].items():
        print(f"{lid}: {len(r['introduced_entry_ids'])} new + {len(r['reviewed_entry_ids'])} review words, {r['examples_matched']} examples match, {r['required_checkpoints']} required / {r['optional_checkpoints']} optional tasks")
    if args.write:
        for path, raw in writes.items(): path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
        (ROOT / 'reports/hsk-level2-lessons-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('written', len(writes), 'files')


if __name__ == '__main__':
    try: main()
    except ValueError as e: print('INVALID:', e, file=sys.stderr); sys.exit(1)
