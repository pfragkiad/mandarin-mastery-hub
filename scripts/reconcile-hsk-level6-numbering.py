#!/usr/bin/env python3
"""Build Level 6 1.0.1 and audio identities against the current official PDF.

Only official numbering/source metadata changes. Published sentence/gloss inputs,
recording bytes and upload pointers remain historical, checksum-bound evidence.
Runtime UUIDs retain their original legacy-ID namespace across fresh imports.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
BASELINE = Path('importer/hsk/hsk3_level6_1.0.0.json')
OUTPUT = Path('importer/hsk/hsk3_level6_1.0.1.json')
OLD_AUDIO = Path('importer/data/hsk-audio/level6-manifest.json')
NEW_AUDIO = Path('importer/data/hsk-audio/level6-manifest-1.0.1.json')
AUDIT = Path('reports/hsk-level6-1.0.1-numbering.json')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def build():
    spec = importlib.util.spec_from_file_location('official_hsk', ROOT / 'scripts/prepare-hsk-level7.py')
    official = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(official)
    manifest = json.loads((ROOT / 'importer/data/hsk-level7/source-manifest.json').read_bytes())
    official.verify_file(manifest['current_pdf'])
    pages = json.loads(official.verify_file(manifest['extractions']['current']))
    rows = [row for row in official.parse_pages(pages) if row['level'] == '6']
    assert [row['id'] for row in rows] == list(range(3601, 5401))
    baseline_raw = (ROOT / BASELINE).read_bytes()
    assert digest(baseline_raw) == manifest['existing_level6']['sha256']
    baseline = json.loads(baseline_raw)
    by_tuple = {(e['syllabus_headword'], e['pinyin'], e['syllabus_pos_zh']): e for e in baseline['entries']}
    assert len(by_tuple) == 1800
    data = copy.deepcopy(baseline)
    data['data_version'] = '1.0.1'
    data['entries'] = []
    changes = []
    for row in rows:
        previous = by_tuple[row['entry'], row['pinyin'], row['part_of_speech']]
        current = copy.deepcopy(previous)
        current['id'] = row['id']
        current['legacy_syllabus_id'] = previous['id']
        current['official_source_pdf_page'] = row['source_pdf_page']
        data['entries'].append(current)
        changes.append({'headword': previous['headword'], 'pinyin': previous['pinyin'],
                        'pos_zh': previous['syllabus_pos_zh'], 'previous_id': previous['id'],
                        'current_id': row['id']})
        assert {k: v for k, v in current.items() if k not in ['id', 'legacy_syllabus_id', 'official_source_pdf_page']} == {
            k: v for k, v in previous.items() if k != 'id'}
    assert sum(row['previous_id'] != row['current_id'] for row in changes) == 850
    data['syllabus']['numbering_revision'] = 'official-site-1219'
    verification = data['verification']
    previous_verification = {key: verification.pop(key) for key in list(verification)
                             if key.startswith('transcription_') or key in ['reference_url', 'word_id_source']}
    verification['previous_numbering_sources'] = previous_verification
    verification['word_id_source'] = 'Direct extraction of the November 2025 official PDF currently linked by chinesetest.cn; official-site-1219 numbering.'
    verification['reference_url'] = manifest['current_pdf']['url']
    verification['numbering_revision'] = {
        'name': 'official-site-1219', 'date': '2026-11-28',
        'official_pdf_sha256': manifest['current_pdf']['sha256'],
        'baseline': {'path': BASELINE.as_posix(), 'sha256': digest(baseline_raw)},
        'changed_ids': 850, 'unchanged_ids': 950,
        'crosswalk': '../../reports/hsk-level6-official-numbering-crosswalk.tsv',
        'uuid_policy': 'Derive new record UUIDs from legacy_syllabus_id; preserve existing UUIDs, examples and recordings during migration.',
    }
    data['changelog'].append({'version': '1.0.1', 'date': '2026-11-28', 'changes': [
        'Reconciled 850 official HSK serials with the current official PDF; all 1,800 word/reading/POS tuples are unchanged.',
        'Retained each previous serial as legacy_syllabus_id for exact migration and stable UUIDs.',
        'Preserved every meaning, taxonomy assignment and example, including all source/revision evidence.']})
    output = encode(data)

    old_audio_raw = (ROOT / OLD_AUDIO).read_bytes()
    audio = json.loads(old_audio_raw)
    old_rows = {row['hskIndex']: row for row in audio['entries']}
    audio['previousHandoff'] = audio['handoff']
    audio['handoff'] = {'file': OUTPUT.name, 'sha256': digest(output)}
    audio['numberingRevision'] = {'name': 'official-site-1219', 'previousManifest': {
        'path': OLD_AUDIO.as_posix(), 'sha256': digest(old_audio_raw.replace(b'\r\n', b'\n')),
        'checksumConvention': 'LF-normalized bytes; the historical manifest predates checksum-pinned line endings.'}}
    audio['entries'] = []
    for row in changes:
        previous = old_rows[row['previous_id']]
        assert (previous['headword'], previous['reading']) == (row['headword'], row['pinyin'])
        current = copy.deepcopy(previous)
        current['previousHskIndex'] = previous['hskIndex']
        current['hskIndex'] = row['current_id']
        audio['entries'].append(current)
    assert len({row['entryId'] for row in audio['entries']}) == 1800
    audit = {'schema_version': 'hsk-level6-numbering-migration/1.0.1',
             'baseline': {'path': BASELINE.as_posix(), 'sha256': digest(baseline_raw)},
             'official_pdf': manifest['current_pdf'],
             'output': {'path': OUTPUT.as_posix(), 'sha256': digest(output), 'bytes': len(output)},
             'audio_manifest': {'path': NEW_AUDIO.as_posix(), 'sha256': digest(encode(audio))},
             'entries': 1800, 'changed_official_ids': 850, 'unchanged_official_ids': 950,
             'lexical_fields_and_examples_preserved': True, 'recording_identities_preserved': True,
             'changes': changes}
    return {OUTPUT: output, NEW_AUDIO: encode(audio), AUDIT: encode(audit)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for relative, raw in build().items():
        assert len(raw) < 9_000_000
        path = ROOT / relative
        if args.write:
            path.write_bytes(raw)
        else:
            assert path.read_bytes() == raw, relative
    print(('Wrote' if args.write else 'Checked') + ' Level 6 1.0.1: 850 official IDs updated; lexical fields, examples and recording identities preserved.')


if __name__ == '__main__':
    main()
