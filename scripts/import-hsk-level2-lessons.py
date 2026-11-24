#!/usr/bin/env python3
"""Audit/import the owner's complete HSK 3.0 Level 2 course package.

Source: importer/data/lessons/Mandarin_HSK_Level2_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.1.1_rev2.zip
(preserved byte-for-byte). It holds 25 nested four-file topic-lesson ZIPs under hsk3/level2/
and curricula/HSK3_2025_LEVEL1_LEVEL2.json, one HSK 3.0 course whose Level 1 section must be
deep-equal to the current Level 1 course (so no Level 1 placement changes) and whose Level 2
section places the 25 lessons. It replaces the earlier one-off Level 2 lesson and its separate
course. Any failed check stops before writing anything:
  * Core v3.3 validator per lesson (schema, taxonomy, catalog refs, checkpoint targets);
  * every word-bank item names one exact runtime Vocabulary record (word or phrase) by HSK
    entry number AND headword with identical pinyin, meaning and examples — except the
    recorded CORRECTIONS below, which align a lesson typo to the word card;
  * each placement's introduced/reviewed IDs equal the lesson's own learning_role items;
  * all 200 Level 2 entries (301–500) are introduced exactly once.

  python scripts/import-hsk-level2-lessons.py            # audit only
  python scripts/import-hsk-level2-lessons.py --write
"""
import argparse, hashlib, importlib.util, io, json, shutil, sys, zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from lesson_cards import card_counts, cards_document  # noqa: E402

PACKAGE = ROOT / 'importer/data/lessons/Mandarin_HSK_Level2_Lessons_v3.3.0_taxonomy-v2.0.0_vocab-v1.1.1_rev2.zip'
LESSONS = ROOT / 'src/data/study_lessons/lessons'
CORE = ROOT / 'src/data/study_lessons/core'
TARGET = LESSONS / 'hsk3/level2'
CURRICULUM = LESSONS / 'curricula/HSK3_2025_LEVEL1.json'
OLD_CURRICULUM = LESSONS / 'curricula/HSK3_2025_LEVEL2.json'
OLD_LESSON = TARGET / 'TOPIC_LESSON_MAKING_PLANS_TOGETHER'
VOCAB = ROOT / 'src/data/vocabulary'
# Owner-visible typo fixes: (lesson stem, example id, field, supplied, corrected-to-word-card).
CORRECTIONS = []  # rev2 fixed the #36 pinyin erratum at source; nothing to align.

# Owner-flagged authoring exceptions: a teaching sentence that repeats a word-card example.
ALLOWED_OVERLAP = {}  # rev2 replaced the reused word-card sentences; no exceptions.


def sha(raw): return hashlib.sha256(raw).hexdigest()
def require(ok, msg):
    if not ok: raise ValueError(msg)


def vocabulary():
    by = {}
    for f in sorted(VOCAB.glob('*.json')):
        if f.name == 'index.json': continue
        for e in json.loads(f.read_bytes()):
            if e.get('hskVersion') == '3.0' and e.get('hsk_index') is not None:
                by.setdefault(e['hsk_index'], []).append(e)
    return by


def check_words(lesson, by):
    intro, review, n_ex = [], [], 0
    for item in lesson['sections']['vocabulary']['items']:
        refs = [r for r in item['syllabus_refs'] if r['curriculum_id'] == 'hsk3-2025']
        require(len(refs) == 1, f"{item['id']}: needs exactly one hsk3-2025 reference")
        eid = refs[0]['entry_id']
        hits = [e for e in by.get(eid, []) if e['simplified'] == item['hanzi']]
        require(len(hits) == 1, f"{item['id']}: no unique Vocabulary record #{eid} {item['hanzi']}")
        e = hits[0]
        require(e['pinyinDisplay'] == item['pinyin'], f"#{eid}: pinyin {item['pinyin']} ≠ {e['pinyinDisplay']}")
        require('; '.join(e['meanings']) == item['meaning_en'], f"#{eid}: meaning differs from the word card")
        want = [[x['simplified'], x['pinyinDisplay'], x['english'], x.get('style'), x.get('register')] for x in e.get('examples', [])]
        got = [[x['hanzi'], x['pinyin'], x['english'], x.get('style'), x.get('register')] for x in item['examples']]
        require(got == want, f"#{eid}: examples differ from the word card")
        n_ex += len(got)
        role = item['learning_role']
        if role == 'introduced': require(e['hskLevel'] == 2, f"#{eid}: introduced word is not Level 2"); intro.append(eid)
        elif role == 'reviewed': require(e['hskLevel'] < 2, f"#{eid}: reviewed word is not from an earlier level"); review.append(eid)
        else: raise ValueError(f"#{eid}: unknown learning_role {role}")
    return intro, review, n_ex


def correct(stem, lesson):
    applied = []
    for s, ex_id, field, old, new in CORRECTIONS:
        if s != stem: continue
        for item in lesson['sections']['vocabulary']['items']:
            for ex in item['examples']:
                if ex['id'] == ex_id:
                    require(ex[field] == old, f'{stem} {ex_id}: correction no longer matches the supplied text')
                    ex[field] = new; applied.append({'example': ex_id, 'field': field, 'supplied': old, 'corrected': new})
    return applied


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--write', action='store_true'); args = ap.parse_args()
    spec = importlib.util.spec_from_file_location('v', CORE / 'validate_core.py'); v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
    catalog = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    by = vocabulary()
    raw_pkg = PACKAGE.read_bytes()
    writes, report = {}, {'package': str(PACKAGE.relative_to(ROOT)), 'sha256': sha(raw_pkg), 'lessons': {}}
    lessons = {}
    with zipfile.ZipFile(io.BytesIO(raw_pkg)) as pkg:
        course = json.loads(pkg.read('curricula/HSK3_2025_LEVEL1_LEVEL2.json'))
        current = json.loads(CURRICULUM.read_bytes())
        require(course['curriculum_id'] == current['curriculum_id'] == 'hsk3-2025', 'curriculum ID changed')
        require(course['sections'][0] == current['sections'][0], 'Level 1 section differs from the current course')
        for name in sorted(n for n in pkg.namelist() if n.startswith('hsk3/level2/') and n.endswith('.zip')):
            stem = Path(name).stem
            with zipfile.ZipFile(io.BytesIO(pkg.read(name))) as z:
                want = {stem + '.json', stem + '.html', stem + '.md', 'report.md'}
                require(set(z.namelist()) == want and z.testzip() is None, f'{stem}: expected exactly its four files')
                lesson = json.loads(z.read(stem + '.json'))
                require(lesson['schema_version'] == 'mandarin-topic-lesson/3.3.0', f'{stem}: expected a v3.3.0 topic lesson')
                fixes = correct(stem, lesson)
                v.checks_lesson(lesson, catalog, ALLOWED_OVERLAP.get(stem, ()))
                intro, review, n_ex = check_words(lesson, by)
                d = TARGET / stem
                for f in want: writes[d / f] = z.read(f)
                if fixes: writes[d / (stem + '.json')] = (json.dumps(lesson, ensure_ascii=False, indent=2) + '\n').encode()
                lessons[lesson['lesson_id']] = (intro, review)
                cps = [c for s in lesson['progress']['sections'] for c in s['checkpoints']]
                report['lessons'][lesson['lesson_id']] = {'directory': str(d.relative_to(ROOT)), 'introduced_entry_ids': intro,
                    'reviewed_entry_ids': review, 'examples_matched': n_ex, 'corrections': fixes,
                    'required_checkpoints': sum(not c['optional'] for c in cps), 'optional_checkpoints': sum(c['optional'] for c in cps)}
    placed = [p for u in course['sections'][1]['units'] for p in u['placements']]
    require(sorted(p['lesson_id'] for p in placed) == sorted(lessons), 'Level 2 placements and lessons differ')
    for p in placed:
        intro, review = lessons[p['lesson_id']]
        require(sorted(p['introduced_syllabus_entry_ids']) == sorted(intro) and sorted(p['reviewed_syllabus_entry_ids']) == sorted(review),
                f"{p['lesson_id']}: placement word IDs differ from the lesson")
    all_intro = sorted(i for a, _ in lessons.values() for i in a)
    require(all_intro == list(range(301, 501)), 'Level 2 entries 301–500 are not each introduced exactly once')
    v.checks_curriculum(course)
    writes[CURRICULUM] = (json.dumps(course, ensure_ascii=False, indent=2) + '\n').encode()
    counts = {k: c for k, c in card_counts(LESSONS).items() if k != 'topic-making-plans-together'}
    for path, raw in writes.items():
        if path.suffix == '.json' and path.parent.parent == TARGET:
            doc = json.loads(raw); cps = [c for s in doc['progress']['sections'] for c in s['checkpoints']]
            counts[doc['lesson_id']] = {'required': sum(not c['optional'] for c in cps), 'optional': sum(c['optional'] for c in cps), 'estimated_minutes': doc.get('estimated_minutes')}
    writes[LESSONS / 'lesson-cards.json'] = cards_document(counts)
    print(f'{len(lessons)} Level 2 lessons; 200/200 entries introduced once; Level 1 section unchanged')
    if args.write:
        if OLD_LESSON.exists(): shutil.rmtree(OLD_LESSON)
        OLD_CURRICULUM.unlink(missing_ok=True)
        for path, raw in writes.items(): path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
        (ROOT / 'reports/hsk-level2-lessons-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('written', len(writes), 'files')


if __name__ == '__main__':
    try: main()
    except ValueError as e: print('INVALID:', e, file=sys.stderr); sys.exit(1)
