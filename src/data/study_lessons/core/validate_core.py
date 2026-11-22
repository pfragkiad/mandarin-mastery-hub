#!/usr/bin/env python3
"""Mandarin core v3 validator. Needs pip install jsonschema.
Usage: python validate_core.py --self-test
       python validate_core.py --lesson file.json --schema character_lesson.schema.json --catalog-ids /path/catalog_ids.json
       python validate_core.py --curriculum file.json --library-dir /path/to/lessons
"""
import json, argparse, pathlib, sys, re
from collections import Counter
from jsonschema import Draft202012Validator, FormatChecker
HERE=pathlib.Path(__file__).resolve().parent

def load(p):return json.loads(pathlib.Path(p).read_text(encoding='utf-8'))
def check_schema(schema_name,document):
    schema=load(HERE/schema_name)
    Draft202012Validator.check_schema(schema)
    problems=list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(document))
    if problems:
        raise ValueError('\n'.join(f"{'.'.join(map(str,e.path))}: {e.message}" for e in problems[:15]))

def each_dict(obj):
    if isinstance(obj,dict):
        yield obj
        for v in obj.values():yield from each_dict(v)
    elif isinstance(obj,list):
        for v in obj:yield from each_dict(v)

def checks_lesson(lesson,catalog=None):
    if 'lesson_type' not in lesson and lesson.get('schema_version','').startswith('mandarin-character-lesson/2.'):
        check_schema('character_lesson.schema.json',lesson)
        return  # Historical files are validated structurally, not against v3 taxonomy.
    kind=lesson['lesson_type']
    expected={'character_usage':'character_lesson.schema.json','topic_vocabulary':'topic_lesson.schema.json',
              'grammar':'general_lesson.schema.json','dialogue':'general_lesson.schema.json',
              'review':'general_lesson.schema.json','generic':'general_lesson.schema.json'}[kind]
    check_schema(expected,lesson)
    cl=lesson['classification'];primary=cl['primary_topic_id'];topics=cl['topic_ids']
    if primary is not None and primary not in topics:raise ValueError('primary_topic_id must occur in topic_ids')
    registry={c['id']:c for c in load(HERE/'lesson_categories.json')['categories']}
    for topic in topics:
        if topic not in registry:raise ValueError('unknown global topic '+topic)
        if registry[topic]['status']=='deprecated':raise ValueError('v3 lessons must not use deprecated topic '+topic)
    seen_refs=set()
    for n in each_dict(lesson):
        if 'correct_choice_ids' in n:
            cid=[c['id'] for c in n.get('choices',[])]
            if len(cid)!=len(set(cid)):raise ValueError('duplicate quiz choice ID: '+n.get('id',''))
            if not set(n['correct_choice_ids']).issubset(set(cid)):
                raise ValueError('incorrect quiz answer ID: '+n.get('id',''))
        if n.get('learning_role')=='introduced':
            for ref in n.get('syllabus_refs',[]):
                pair=(ref['curriculum_id'],str(ref['entry_id']))
                if pair in seen_refs:raise ValueError('duplicate introduced syllabus item '+str(pair))
                seen_refs.add(pair)
    if catalog is not None:
        refs=lesson.get('catalog_character_refs',{})
        for ch,ident in refs.items():
            if catalog.get(ch)!=ident:raise ValueError('catalog ID mismatch or missing for '+ch)
        # Every known Chinese written character anywhere in learner-visible JSON must be resolved.
        import unicodedata
        used=set()
        def visit(v):
            if isinstance(v,dict):
                for key,val in v.items():
                    if key!='catalog_character_refs':visit(val)
            elif isinstance(v,list):
                for val in v:visit(val)
            elif isinstance(v,str):
                used.update(ch for ch in v if unicodedata.name(ch,'').startswith('CJK UNIFIED IDEOGRAPH'))
        visit(lesson)
        missing=sorted((used & catalog.keys())-refs.keys())
        if missing:raise ValueError('missing catalog character references: '+''.join(missing))
        if kind=='character_usage':
            hanzi=lesson['headword']['hanzi']
            if len(hanzi)==1 and catalog.get(hanzi) and lesson['metadata']['catalog_character_id']!=catalog[hanzi]:
                raise ValueError('headword catalog character ID mismatch')
    # Authoring: do not allow source/provenance in learner-facing source blocks.
    if lesson['schema_version'].endswith('/3.0.0'):
        forbidden={'report_intake','source_files','original_video','extraction_stats'}
        bad=[key for node in each_dict(lesson) for key in node if key in forbidden]
        if bad:raise ValueError('report-only field(s) in learner lesson: '+str(bad))

def checks_curriculum(doc,library=None):
    check_schema('curriculum.schema.json',doc)
    glob={t['id'] for t in load(HERE/'lesson_categories.json')['categories'] if t['status']=='active'}
    private={t['id'] for t in doc['course_topics']}
    if len(private)!=len(doc['course_topics']):raise ValueError('duplicate private course topic ID')
    for t in doc['course_topics']:
        if set(t['global_topic_ids'])-glob:raise ValueError('unknown global topic in private topic '+t['id'])
    sections=doc['sections']
    if len({s['section_id'] for s in sections})!=len(sections):raise ValueError('duplicate section ID')
    allp=[];unitids=[]
    for s in sections:
        if len({u['sequence'] for u in s['units']})!=len(s['units']):raise ValueError('duplicate unit sequence')
        for u in s['units']:
            unitids.append(u['unit_id'])
            if len({p['sequence'] for p in u['placements']})!=len(u['placements']):raise ValueError('duplicate placement sequence')
            allp += u['placements']
    if len(unitids)!=len(set(unitids)):raise ValueError('duplicate unit id')
    if len([p['placement_id'] for p in allp])!=len({p['placement_id'] for p in allp}):raise ValueError('duplicate placement id')
    intro=[]
    for p in allp:
        if set(p['course_topic_ids'])-private:raise ValueError('undefined course-private topic in placement')
        if set(p['introduced_syllabus_entry_ids'])&set(p['reviewed_syllabus_entry_ids']):raise ValueError('entry introduced AND reviewed in one placement')
        intro += p['introduced_syllabus_entry_ids']
    if len(intro)!=len(set(intro)):raise ValueError('a syllabus item is introduced in more than one course placement')
    if library is not None:
        known={load(f)['lesson_id'] for f in pathlib.Path(library).rglob('*.json')
               if isinstance(load(f),dict) and 'lesson_id' in load(f)}
        missing={p['lesson_id'] for p in allp}-known
        if missing:raise ValueError('unresolved lesson IDs: '+str(sorted(missing)))

def run_test():
    tests=[('character_lesson.schema.json','CHARACTER_LESSON_TEMPLATE.json'),
        ('topic_lesson.schema.json','TOPIC_LESSON_TEMPLATE.json'),
        ('general_lesson.schema.json','GRAMMAR_LESSON_TEMPLATE.json'),
        ('general_lesson.schema.json','DIALOGUE_LESSON_TEMPLATE.json'),
        ('general_lesson.schema.json','REVIEW_LESSON_TEMPLATE.json'),
        ('general_lesson.schema.json','GENERIC_LESSON_TEMPLATE.json'),
        ('curriculum.schema.json','CURRICULUM_HSK3_TEMPLATE.json'),
        ('curriculum.schema.json','CURRICULUM_PIMSLEUR_TEMPLATE.json'),
        ('lesson_categories.schema.json','lesson_categories.json')]
    for schema,file in tests:
        check_schema(schema,load(HERE/file))
        if 'LESSON_TEMPLATE.json' in file:checks_lesson(load(HERE/file))
        if file.startswith('CURRICULUM_'):checks_curriculum(load(HERE/file))
        print('OK',file)
    cats=load(HERE/'lesson_categories.json')['categories']
    assert sum(c['status']=='active' for c in cats)==20
    print('All self-tests passed; 20 active global topics')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--self-test',action='store_true')
    ap.add_argument('--lesson',type=pathlib.Path);ap.add_argument('--schema',type=str)
    ap.add_argument('--catalog-ids',type=pathlib.Path)
    ap.add_argument('--curriculum',type=pathlib.Path);ap.add_argument('--library-dir',type=pathlib.Path)
    args=ap.parse_args()
    try:
        if args.self_test:run_test()
        if args.lesson:
            obj=load(args.lesson)
            if args.schema:check_schema(args.schema,obj)
            catalog=load(args.catalog_ids)['characters'] if args.catalog_ids else None
            checks_lesson(obj,catalog)
            print('VALID lesson:',obj['lesson_id'])
        if args.curriculum:
            doc=load(args.curriculum);checks_curriculum(doc,args.library_dir)
            print('VALID curriculum:',doc['curriculum_id'])
        if not (args.lesson or args.curriculum or args.self_test):ap.print_help()
    except (ValueError,KeyError,AssertionError) as err:
        print('INVALID:',str(err),file=sys.stderr);sys.exit(1)
