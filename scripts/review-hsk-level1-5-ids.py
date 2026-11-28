#!/usr/bin/env python3
"""Validate the supplied Levels 1-5 report without changing study content.

Uses the preserved current official PDF extraction and exact supplied handoffs;
records a complete mapping, report corrections, language issues and lesson impact.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import unicodedata

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports/hsk-level1-5-official-id-crosscheck-validation.md'
AUDIT = REPORT.with_suffix('.json')
VERSIONS = {1: '1.7.1', 2: '1.1.1', 3: '1.1.2', 4: '1.1.1', 5: '1.0.5'}


def load(path):
    return json.loads((ROOT / path).read_bytes())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def reading(value):
    # Formatting only: tonal and neutral syllables remain distinct.
    return re.sub(r"[\s'’]", '', unicodedata.normalize('NFC', value).lower())


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def build():
    official = module('official_hsk_review', 'prepare-hsk-level7.py')
    manifest = load('importer/data/hsk-level7/source-manifest.json')
    official.verify_file(manifest['current_pdf'])
    official.verify_file(manifest['previous_pdf'])
    rows = official.parse_pages(json.loads(official.verify_file(manifest['extractions']['current'])))
    supplied = load('reports/hsk-level1-5-official-id-crosscheck.json')
    assert supplied['source']['sha256'] == manifest['current_pdf']['sha256']
    index = load('src/data/vocabulary/index.json')
    runtime = [e for part in index['parts'] for e in load('src/data/vocabulary/' + part)]
    # Historical review identities belong to the offline ledger, never app data.
    legacy_by_uuid = {e['uuid']: e['legacy_id'] for e in load('importer/data/hsk-level1-5-numbering/legacy-bindings.json')['entries']}
    runtime_by_id = {legacy_by_uuid[e['id']]: e
                     for e in runtime if e['hskLevel'] in VERSIONS}
    assert len(runtime_by_id) == 3600
    mappings, summary, pinyin, pos, homographs = [], [], [], [], []
    inputs = []
    for level, version in VERSIONS.items():
        path = f'importer/hsk/hsk3_level{level}_{version}.json'
        inputs.append({'path': path, 'sha256': sha((ROOT / path).read_bytes())})
        handoff = load(path)
        entries = handoff['entries']
        pos_labels = {p['id']: p['label'] for p in handoff['taxonomy']['parts_of_speech']}
        by_form = defaultdict(list)
        for row in rows:
            if row['level'] == str(level):
                by_form[row['hanzi']].append(row)
        claimed = {r['repoId']: r['officialId'] for r in supplied['levels'][str(level)]['idRemaps']}
        moved = 0
        for entry in entries:
            choices = by_form[entry['headword']]
            if len(choices) > 1:
                exact = [r for r in choices if r['entry'] == entry.get('syllabus_headword')
                         and reading(r['pinyin']) == reading(entry['pinyin'])]
                choices = exact or [r for r in choices if reading(r['pinyin']) == reading(entry['pinyin'])]
            assert len(choices) == 1, (level, entry['id'])
            row = choices[0]
            assert claimed.get(entry['id'], entry['id']) == row['id'], (level, entry['id'])
            current = runtime_by_id[entry['id']]
            assert (current['simplified'], current['pinyinDisplay']) == (entry['headword'], entry['pinyin'])
            moved += entry['id'] != row['id']
            mappings.append({'level': level, 'headword': entry['headword'], 'pinyin': entry['pinyin'],
                             'previous_id': entry['id'], 'official_id': row['id'],
                             'official_pdf_page': row['source_pdf_page'], 'runtime_uuid': current['id'],
                             'recording_attached': bool(current.get('audio'))})
            evidence = {'level': level, 'headword': entry['headword'], 'previous_id': entry['id'],
                        'official_id': row['id'], 'pdf_page': row['source_pdf_page']}
            if entry['pinyin'] != row['pinyin']:
                pinyin.append({**evidence, 'stored': entry['pinyin'], 'official': row['pinyin'],
                               'kind': 'formatting' if reading(entry['pinyin']) == reading(row['pinyin']) else 'tone'})
            if entry.get('syllabus_pos_zh') is not None and entry['syllabus_pos_zh'] != row['part_of_speech']:
                pos.append({**evidence, 'stored': entry['syllabus_pos_zh'], 'official': row['part_of_speech'],
                            'runtime_classification': ' / '.join(pos_labels[identity] for identity in entry['pos_ids'])})
            if entry.get('syllabus_headword') is not None and entry['syllabus_headword'] != row['entry']:
                homographs.append({**evidence, 'stored': entry['syllabus_headword'], 'official': row['entry']})
        assigned = [m['official_id'] for m in mappings if m['level'] == level]
        assert len(assigned) == len(set(assigned)) == len(entries)
        assert moved == supplied['levels'][str(level)]['idMismatches']
        summary.append({'level': level, 'entries': len(entries), 'changed_ids': moved,
                        'unchanged_ids': len(entries) - moved})
    assert sum(s['changed_ids'] for s in summary) == 1092
    assert Counter(p['kind'] for p in pinyin) == {'formatting': 2, 'tone': 1}
    assert len(pos) == 6 and len(homographs) == 2

    previous_pages_path = 'importer/data/hsk-level7/review-level1-5-previous-pages.json'
    previous_rows = {r['id']: r for r in official.parse_pages(load(previous_pages_path))}
    for identity in [235, 678, 679, 680, 681, 682]:
        old = previous_rows[identity]
        new = next(r for r in rows if r['id'] == identity)
        assert (old['entry'], old['pinyin'], old['part_of_speech']) == (new['entry'], new['pinyin'], new['part_of_speech'])
    assert previous_rows[2012]['part_of_speech'] == '形、副'
    assert next(r for r in rows if r['id'] == 2012)['part_of_speech'] == '副'
    audio = module('hsk_audio_review', 'import-hsk-level2-audio.py')
    recorded = audio.source_index((audio.INPUT / 'cmn-caen-tan-index.xml.bz2').read_bytes())['小朋友']
    assert any(r['reading'] == runtime_by_id[235]['pinyinDisplay'] for r in recorded)
    assert all(reading(r['reading']) != reading(next(r for r in rows if r['id'] == 235)['pinyin']) for r in recorded)
    changed_ids = {m['previous_id'] for m in mappings if m['previous_id'] != m['official_id']}
    lesson_counts, lesson_files = Counter(), defaultdict(set)
    def scan(value, path):
        if isinstance(value, dict):
            for key, item in value.items():
                if key == 'syllabus_refs' and isinstance(item, list):
                    for ref in item:
                        if isinstance(ref, dict) and ref.get('entry_id') in changed_ids:
                            lesson_counts[key] += 1
                            lesson_files[key].add(path)
                if key in ['introduced_syllabus_entry_ids', 'reviewed_syllabus_entry_ids', 'entry_ids'] and isinstance(item, list):
                    for identity in item:
                        if isinstance(identity, int) and identity in changed_ids:
                            lesson_counts[key] += 1
                            lesson_files[key].add(path)
                scan(item, path)
        elif isinstance(value, list):
            for item in value:
                scan(item, path)
    for path in sorted((ROOT / 'src/data/study_lessons').rglob('*.json')):
        scan(json.loads(path.read_bytes()), path.relative_to(ROOT).as_posix())
    audit = {'schema_version': 'hsk-level1-5-report-validation/1.0.0',
             'verdict': 'All 1092 JSON ID remaps confirmed; Markdown corrections and additional migration requirements identified.',
             'official_pdf': manifest['current_pdf'], 'handoffs': inputs, 'level_summary': summary,
             'reviewed_report_sha256_lf': sha((ROOT / 'reports/hsk-level1-5-official-id-crosscheck.json').read_bytes().replace(b'\r\n', b'\n')),
             'runtime_entries_verified': 3600, 'changed_ids': 1092, 'unchanged_ids': 2508,
             'pinyin_differences': pinyin, 'pos_differences': pos, 'homograph_differences': homographs,
             'previous_official_spotcheck': {'path': previous_pages_path,
                                           'sha256': sha((ROOT / previous_pages_path).read_bytes()),
                                           'unchanged_ids': [235, 678, 679, 680, 681, 682],
                                           'official_pos_revision': {'id': 2012, 'headword': '白', 'previous': '形、副', 'current': '副'}},
             'small_friend_recording_metadata': recorded,
             'lesson_reference_occurrences': dict(lesson_counts),
             'lesson_reference_file_counts': {key: len(paths) for key, paths in lesson_files.items()},
             'runtime_recordings_to_preserve': 2988,
             'runtime_data_changed': False, 'mappings': mappings}
    table = '\n'.join(f"| {s['level']} | {s['entries']:,} | {s['changed_ids']} | {s['unchanged_ids']} |" for s in summary)
    report = f'''# Validation of the HSK Levels 1–5 official-ID report

The [supplied report](hsk-level1-5-official-id-crosscheck.md) and its JSON were
checked against the preserved current official PDF extraction, all five current
handoffs and all 3,600 runtime entries. **All 1,092 ID remaps in the JSON are
correct.** No vocabulary, source handoff, recording or lesson file is changed by
this validation. The original report is retained unchanged.

| Level | Entries | Changed official IDs | Unchanged IDs |
| --- | ---: | ---: | ---: |
{table}
| Total | 3,600 | 1,092 | 2,508 |

## Corrections to the report

The Markdown homograph summary gives two incorrect official IDs. The official
PDF and the report's own JSON give **乘1 = 1081** (old ID 1078), and **等2 = 1147**
(old ID also 1147). The Markdown's 1077 and 1149 must not be used. The complete
JSON ID-remap list is correct; 等 has a homograph-label correction without an ID change.

“Zero headword+pinyin set differences / exact bijection” needs qualification.
Written-form coverage is unchanged and the entry mapping is one-to-one, but
小朋友 has a real neutral-versus-third-tone discrepancy. The other two Level 1
reading differences are apostrophe/spacing formatting only: 女儿 and 谁.

## Additional findings that matter for migration

**Level 3 classifications need actual correction.** 还 huán, 换 and 回答 must be
verbs; 环境 and 黄色 must be nouns. The incorrect labels are present both in the
handoffs' `pos_ids`/primary POS and the application's `partOfSpeech` and
`studyMetadata`, rather than only in documentary Chinese labels. Their meanings
and examples already fit the correct senses. Both official PDFs agree on these
POS values, so this is an existing data defect, not a newly revised official classification.

**Level 5 白 needs a sense/example correction as well as POS.** The official row
2012 is adverb 副. The handoff currently says “white; in vain” and includes
`你的衬衫真白。` and `她把白纸放在桌上。` Both examples teach the adjective “white.”
Changing only the label to adverb would leave both examples mismatched. The
adverb meaning and two appropriate examples should be reviewed together. The
earlier official PDF allowed 形、副 (adjective and adverb); the current PDF gives
only 副. The adjective examples fit the earlier published scope, but do not
demonstrate the restricted current entry. This is a real official POS-scope
revision, distinct from the five Level 3 data defects.

**小朋友 requires an explicit pronunciation decision.** Both official PDFs print
`xiǎopéngyǒu`; the stored word and preserved Shtooka recording metadata use
`xiǎopéngyou`. A recording is already attached. The source confirms a neutral-tone
recording label; no listening certification is claimed. Do not relabel that clip
as third tone or silently replace the lexical reading while keeping a mismatched
attachment. Keep the official citation reading and the recorded pronunciation
separate, or review a compatible recording before changing the active reading.

## Associated files that a migration must cover

As with the completed Level 6 migration, preserve UUIDs, record order, existing
examples and all **2,988 Level 1–5 word recordings**. Use versioned new handoffs,
an explicit old-to-current map, updated current source references and versioned
audio manifests. Retain historical inputs and their original serials. Match
numbered homographs such as 花1/花2 and 称1/称2 separately, not by form alone.

Levels 1–5 also participate in lessons. A scan finds **61 affected `syllabus_refs`
occurrences in 31 files**, **74 affected `entry_ids` occurrences in 24 files**,
and **50 introduced plus 7 reviewed curriculum-ID occurrences**. These are
occurrences in the named fields, not unique words; file sets overlap. Lesson
word links require both the recorded ID and exact headword, and curriculum
placements use IDs, so changing vocabulary IDs alone can lose or misassign links.
Update/version those bindings together and verify saved lesson/progress identities.
Regenerate ID-dependent public example sidecars from the same mapping. Do not
apply a broad numeric find/replace across unrelated editions or immutable source archives.

The [machine validation](hsk-level1-5-official-id-crosscheck-validation.json)
contains all 3,600 mappings, runtime UUIDs and source-page evidence.

```sh
python scripts/review-hsk-level1-5-ids.py --write
python scripts/review-hsk-level1-5-ids.py --check
```
'''
    return {AUDIT: (json.dumps(audit, ensure_ascii=False, indent=2) + '\n').encode('utf-8'),
            REPORT: report.encode('utf-8')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for path, raw in build().items():
        if args.write:
            path.write_bytes(raw)
        else:
            assert path.read_bytes() == raw, path
    print(('Wrote' if args.write else 'Checked') + ' Level 1–5 report validation: all 1092 ID remaps confirmed; no study data modified.')


if __name__ == '__main__':
    main()
