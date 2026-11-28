#!/usr/bin/env python3
"""Build/check the complete Level 6 1.0.0 handoff from checksum-bound revisions.

The baseline and review files are immutable inputs. Revision payloads contain all
Chinese, pinyin and English, so rebuilding never regenerates language mechanically.
Only example records and release metadata change; lexical identities stay exact.
"""
import argparse
from collections import Counter
import copy
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path('importer/data/hsk-level6/release-1.0.0-revisions.json')
OUTPUT = Path('importer/hsk/hsk3_level6_1.0.0.json')
AUDIT = Path('reports/hsk-level6-1.0.0-build.json')
CHANGES = Path('reports/hsk-level6-1.0.0-example-changes.tsv')
REPORT = Path('reports/hsk-level6-1.0.0-build.md')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical_hash(value):
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def build(root=ROOT):
    raw_manifest = (root / MANIFEST).read_bytes()
    manifest = json.loads(raw_manifest)
    assert manifest['schema_version'] == 'hsk-level6-reviewed-revisions/1.0.0'
    baseline_bytes = (root / manifest['baseline']['path']).read_bytes()
    assert digest(baseline_bytes) == manifest['baseline']['sha256'], 'Baseline changed'
    baseline = json.loads(baseline_bytes)
    assert baseline['data_version'] == manifest['baseline']['data_version'] == '0.1.0'
    for source in manifest['review_sources'] + manifest['new_rewrite_reading_sources']:
        assert digest((root / source['path']).read_bytes()) == source['sha256'], source['path']
    data = copy.deepcopy(baseline)
    by_id = {e['id']: e for e in data['entries']}
    replacements = {(p['entry_id'], p['style']): p for p in manifest['example_replacements']}
    readings = {(p['entry_id'], p['style']): p for p in manifest['targeted_pinyin_corrections']}
    assert len(replacements) == 704 and len(readings) == 17
    assert not set(replacements) & set(readings)
    assert not manifest['punctuation_normalizations']
    source_rows = list(csv.DictReader((root / 'reports/hsk-level6-0.1.0-sentence-review.tsv').open(encoding='utf-8-sig'), delimiter='\t'))
    flagged = {(int(row['id']), row['style']) for row in source_rows if row['review_status'] != 'pass_candidate'}
    assert len(flagged) == manifest['baseline_flagged_examples'] == 693
    assert flagged <= set(replacements), 'An originally flagged example was not replaced'
    changes = []
    for id, style in sorted(set(replacements) | set(readings)):
        entry = by_id[id]
        index = next(i for i, ex in enumerate(entry['examples']) if ex['style'] == style)
        previous = entry['examples'][index]
        patch = replacements.get((id, style)) or readings[id, style]
        assert entry['headword'] == patch['headword']
        assert canonical_hash(previous) == patch['expected_example_sha256'], (id, style)
        revision = {'version': '1.0.0', 'baseline_version': '0.1.0',
                    'baseline_example_sha256': patch['expected_example_sha256'],
                    'manifest': '../data/hsk-level6/release-1.0.0-revisions.json',
                    'evidence': patch['evidence'], 'date': manifest['accepted_on']}
        if (id, style) in replacements:
            replacement = patch['replacement']
            assert entry['headword'] in replacement['hanzi'], (id, style)
            assert replacement['hanzi'] != previous['hanzi'], (id, style)
            assert all(replacement[k].strip() for k in ['hanzi', 'pinyin', 'english'])
            limit = 16 if style == 'conversational' else 20
            assert len(replacement['hanzi']) <= limit, (id, style)
            if patch['review_status'] == 'new_editorial_rewrite_needs_language_review' and style == 'written':
                assert len(replacement['hanzi']) >= 10, (id, style)
            revision['kind'] = patch['kind']
            # A new sentence never inherits the old corpus identity or attachment.
            current = {'style': style, 'register': previous['register'], **replacement,
                       'note': ('Owner-accepted review revision.' if patch['review_status'] == 'owner_accepted_editorial_revision'
                                else 'New context-specific editorial rewrite requested after the sentence reviews; independent language review remains outstanding.'),
                       'review_status': patch['review_status'], 'provenance': 'newly_authored',
                       'linguistic_source': 'editorial_enrichment', 'revision': revision}
        else:
            assert previous['pinyin'] == patch['expected_pinyin']
            current = copy.deepcopy(previous)
            current['pinyin'] = patch['pinyin']
            current['review_status'] = 'targeted_contextual_pinyin_correction'
            revision['kind'] = 'contextual_pinyin_correction'
            current['revision'] = revision
            current['note'] += ' Release 1.0.0 applies a targeted contextual reading correction; the Chinese and English are unchanged.'
        entry['examples'][index] = current
        changes.append({'entry_id': id, 'headword': entry['headword'], 'style': style,
                        'kind': revision['kind'], 'before': previous, 'after': current})

    texts = Counter(ex['hanzi'] for e in data['entries'] for ex in e['examples'])
    assert all(n == 1 for n in texts.values()), 'Duplicate sentence texts in release'
    for old, new in zip(baseline['entries'], data['entries']):
        assert {k: v for k, v in old.items() if k != 'examples'} == {k: v for k, v in new.items() if k != 'examples'}
        assert [ex['style'] for ex in new['examples']] == ['conversational', 'written']
    summary = {'entries': len(data['entries']), 'examples': sum(len(e['examples']) for e in data['entries']),
               'accepted_replacements': 69, 'new_editorial_rewrites': 635, 'replaced_examples': len(replacements),
               'pinyin_only_corrections': len(readings), 'changed_examples': len(changes),
               'changed_entries': len({c['entry_id'] for c in changes}),
               'unchanged_examples': 3600 - len(changes), 'baseline_flagged_examples': len(flagged),
               'baseline_flagged_examples_replaced': len(flagged & set(replacements)),
               'duplicate_sentence_texts': 0, 'lexical_fields_unchanged': True}
    assert summary['entries'] == 1800 and summary['examples'] == 3600
    data['data_version'] = '1.0.0'
    v = data['verification']
    v.pop('original_100_entry_sha256', None)
    v.pop('added_example_counts', None)
    v.update(status='complete_review_rewrite_with_owner_accepted_revisions',
             sentence_policy='Two examples per headword, conversational then written. All 693 originally flagged examples have new wording; the 69 accepted proposals and final overrides are retained. Every new sentence has editorial provenance, with no inherited corpus IDs or audio.',
             pinyin_policy=manifest['pinyin_convention'],
             review_limitations='The 69 reviewed replacements were accepted by the owner; 635 further rewrites were requested by the owner and remain newly authored editorial drafts. Structural, source-identity, length and duplication checks do not certify native-speaker review or a strict HSK vocabulary boundary. Other unflagged legacy examples retain their recorded review status.',
             baseline={'path': 'hsk3_level6_0.1.0.json', 'sha256': manifest['baseline']['sha256']},
             revision_manifest={'path': '../data/hsk-level6/release-1.0.0-revisions.json', 'sha256': digest(raw_manifest)},
             example_provenance_counts=dict(Counter(ex['provenance'] for e in data['entries'] for ex in e['examples'])),
             review_resolution=summary)
    data['changelog'].append({'version': '1.0.0', 'date': manifest['accepted_on'], 'changes': [
        'Consolidated all 69 owner-accepted replacements, including the eight final-round overrides.',
        'Authored 635 additional contextual replacements, covering every remaining flagged example and the additional 看好 false match.',
        'Corrected 17 contextual readings, including 15 remaining noun uses of 结果 to jiéguǒ, without changing Chinese or English.',
        'Preserved every word ID, headword, lexical reading, meaning, POS and topic/subtopic assignment, plus the unchanged 0.1.0 baseline and reviews.',
        'Recorded revision evidence and separate owner-accepted versus newly authored review status; removed stale original-100 preservation claims from this new release.']})
    output = encoded(data)
    audit = {'schema_version': 'hsk-level6-release-audit/1.0.0', 'release_version': '1.0.0',
             'baseline': manifest['baseline'], 'revision_manifest': {'path': MANIFEST.as_posix(), 'sha256': digest(raw_manifest)},
             'output': {'path': OUTPUT.as_posix(), 'sha256': digest(output), 'bytes': len(output)},
             'summary': summary, 'changes': changes}
    stream = io.StringIO(newline='')
    writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
    writer.writerow(['entry_id', 'headword', 'style', 'kind', 'review_status', 'before_hanzi', 'after_hanzi', 'before_pinyin', 'after_pinyin', 'before_english', 'after_english'])
    for c in changes:
        a, b = c['before'], c['after']
        writer.writerow([c['entry_id'], c['headword'], c['style'], c['kind'], b['review_status'], a['hanzi'], b['hanzi'], a['pinyin'], b['pinyin'], a['english'], b['english']])
    report = f'''# HSK Level 6 Version 1.0.0 Build

The [1.0.0 handoff](../importer/hsk/hsk3_level6_1.0.0.json) contains all 1,800 entries and 3,600 examples. It incorporates 69 accepted replacements and 635 additional rewrites requested by the owner. **All 693 examples flagged in the original review have been replaced.**

| Change | Count |
| --- | ---: |
| Owner-accepted replacements | 69 |
| Additional contextual rewrites | 635 |
| Total replaced examples | 704 |
| Additional pinyin-only corrections | 17 |
| Changed examples | {summary['changed_examples']} |
| Changed entries | {summary['changed_entries']} |
| Unchanged examples | {summary['unchanged_examples']} |
| Duplicate sentence texts | 0 |

The [change sheet](hsk-level6-1.0.0-example-changes.tsv) provides before/after Chinese, pinyin and English for every change. The [audit JSON](hsk-level6-1.0.0-build.json) retains complete before/after example records and output checksums. The [revision input](../importer/data/hsk-level6/release-1.0.0-revisions.json) binds the baseline and all review files by checksum.

All lexical fields, record order and taxonomy remain exact. The [0.1.0 handoff](../importer/hsk/hsk3_level6_0.1.0.json) and original reviews remain unchanged. New text never inherits corpus sentence IDs, source recordings or exact-source claims. The 17 pinyin-only corrections retain their original Chinese, English and source attribution: 15 noun uses of 结果 plus classifier 只 and structural 的 followed by 士兵.

Rewritten conversational examples are at most 16 characters and written examples at most 20, counting punctuation. New written drafts have at least 10 characters; the accepted 5369 转 example retains its reviewed nine-character wording. The written 4282 结果 example uses the accepted correction 这棵果树去年开始结果。 rather than the rejected autumn-flowering generalization.

The 635 additional rewrites are newly authored drafts, distinct from the 69 owner-accepted examples. The release does not claim independent native-speaker certification or a strict HSK vocabulary-boundary audit. Application vocabulary, fonts and recordings have not been imported or changed.

From the repository root:

```sh
python scripts/build-hsk-level6-release.py --write
python scripts/build-hsk-level6-release.py --check
node scripts/validate-hsk-level6.mjs --source importer/hsk/hsk3_level6_1.0.0.json
```

Output SHA-256: `{digest(output)}`.
'''
    return {OUTPUT: output, AUDIT: encoded(audit), CHANGES: stream.getvalue().encode('utf-8'), REPORT: report.encode('utf-8')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = build()
    for relative, content in outputs.items():
        path = ROOT / relative
        if args.check:
            assert path.read_bytes() == content, f'Generated output differs: {relative}'
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
    print(('Checked' if args.check else 'Wrote') + ' Level 6 1.0.0: 1,800 entries, 3,600 examples, 704 replacements and 17 pinyin-only corrections.')


if __name__ == '__main__':
    main()
