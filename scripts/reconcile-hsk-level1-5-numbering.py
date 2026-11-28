#!/usr/bin/env python3
"""Build versioned Level 1-5 handoffs/audio bindings from the validated official map.

Historical handoffs, audio manifests and lesson packages remain exact. The
spoken 小朋友 reading stays matched to its recording; official citation pinyin
is a separate field. Only the approved POS/sense/example changes affect language.
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
VERSIONS = {1: ('1.7.1', '1.7.2'), 2: ('1.1.1', '1.1.2'), 3: ('1.1.2', '1.1.3'),
            4: ('1.1.1', '1.1.2'), 5: ('1.0.5', '1.0.6')}
BINDINGS = Path('importer/data/hsk-level1-5-numbering/legacy-bindings.json')
AUDIT = Path('reports/hsk-level1-5-official-numbering-migration.json')


def read(path):
    return json.loads((ROOT / path).read_bytes())


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def build():
    spec = importlib.util.spec_from_file_location('official_numbering', ROOT / 'scripts/prepare-hsk-level7.py')
    official = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(official)
    manifest = read('importer/data/hsk-level7/source-manifest.json')
    official.verify_file(manifest['current_pdf'])
    rows = official.parse_pages(json.loads(official.verify_file(manifest['extractions']['current'])))
    official_by_id = {row['id']: row for row in rows}
    validation = read('reports/hsk-level1-5-official-id-crosscheck-validation.json')
    assert validation['changed_ids'] == 1092
    mapped = {m['previous_id']: m for m in validation['mappings']}
    bindings_raw = (ROOT / BINDINGS).read_bytes()
    bindings = json.loads(bindings_raw)['entries']
    assert len(bindings) == 3600
    runtime_by_old = {row['legacy_id']: row for row in bindings}
    assert len(runtime_by_old) == 3600
    outputs, summaries = {}, []
    for level, (previous_version, version) in VERSIONS.items():
        baseline_path = Path(f'importer/hsk/hsk3_level{level}_{previous_version}.json')
        output_path = Path(f'importer/hsk/hsk3_level{level}_{version}.json')
        baseline_raw = (ROOT / baseline_path).read_bytes()
        baseline = json.loads(baseline_raw)
        data = copy.deepcopy(baseline)
        data['data_version'] = version
        entries, changed, pos_changes = [], 0, []
        for old in baseline['entries']:
            mapping = mapped[old['id']]
            row = official_by_id[mapping['official_id']]
            bound = runtime_by_old[old['id']]
            assert bound['level'] == level and bound['source_sha256'] == digest(baseline_raw)
            assert (bound['headword'], bound['pinyin']) == (old['headword'], old['pinyin'])
            assert row['hanzi'] == old['headword']
            e = copy.deepcopy(old)
            e.update(id=row['id'], legacy_syllabus_id=old['id'],
                     legacy_syllabus_headword=old.get('syllabus_headword', old['headword']),
                     legacy_syllabus_pos_zh=old.get('syllabus_pos_zh'),
                     syllabus_headword=row['entry'], syllabus_pos_zh=row['part_of_speech'],
                     syllabus_pinyin=row['pinyin'], official_source_pdf_page=row['source_pdf_page'])
            changed += e['id'] != old['id']
            if level == 3 and old['id'] in [678, 679, 680, 681, 682]:
                target = 'verb' if row['part_of_speech'] == '动' else 'noun'
                e['primary_pos_id'], e['pos_ids'] = target, [target]
                pos_changes.append({'legacy_id': old['id'], 'current_id': e['id'], 'headword': e['headword'],
                                    'previous': old['pos_ids'], 'current': [target]})
            if level == 1 and old['id'] == 235:
                assert e['pinyin'] == 'xiǎopéngyou' and row['pinyin'] == 'xiǎopéngyǒu'
                e['pronunciation_note'] = ('Official citation reading: xiǎopéngyǒu. The recorded lexical reading '
                    'xiǎopéngyou retains the neutral tone documented by the existing Shtooka recording metadata; '
                    'the two fields are not an acoustic certification or an interchangeable recording binding.')
            if level == 5 and old['id'] == 2012:
                assert row['part_of_speech'] == '副'
                e['primary_pos_id'], e['pos_ids'] = 'adverb', ['adverb']
                e['meaning_en'] = 'in vain; for nothing'
                pos_changes.append({'legacy_id': old['id'], 'current_id': e['id'], 'headword': e['headword'],
                                    'previous': old['pos_ids'], 'current': ['adverb']})
                examples = [
                    ('conversational', 'neutral_spoken', '别去了，去了也是白去。',
                     'Bié qù le, qù le yě shì bái qù.', "Don't go; going would be pointless."),
                    ('written', 'plain_written', '由于地址有误，快递员白跑了一趟。',
                     'Yóuyú dìzhǐ yǒu wù, kuàidìyuán bái pǎo le yí tàng.',
                     'The courier made a wasted trip because the address was wrong.'),
                ]
                e['examples'] = [{'style': style, 'register': register, 'hanzi': hanzi, 'pinyin': pinyin,
                                  'english': english, 'note': 'Editorial replacement for the current official adverb-only 白 entry; language review remains outstanding.',
                                  'review_status': 'editorial_draft_needs_language_review', 'provenance': 'newly_authored',
                                  'linguistic_source': 'editorial_enrichment',
                                  'revision': {'version': version, 'kind': 'official_pos_scope_reconciliation',
                                               'baseline_source': baseline_path.as_posix(), 'baseline_id': old['id'],
                                               'evidence': 'reports/hsk-level1-5-official-id-crosscheck-validation.md'}}
                                 for style, register, hanzi, pinyin, english in examples]
            else:
                assert e['examples'] == old['examples']
            assert e['pinyin'] == old['pinyin']
            entries.append(e)
        data['entries'] = sorted(entries, key=lambda e: e['id'])
        assert len({e['legacy_syllabus_id'] for e in entries}) == len(entries)
        data['syllabus']['numbering_revision'] = 'official-site-1219'
        data['verification']['numbering_revision'] = {
            'name': 'official-site-1219', 'date': '2026-11-28',
            'official_pdf_url': manifest['current_pdf']['url'], 'official_pdf_sha256': manifest['current_pdf']['sha256'],
            'baseline': {'path': baseline_path.as_posix(), 'sha256': digest(baseline_raw)},
            'changed_ids': changed, 'legacy_bindings_sha256': digest(bindings_raw),
            'citation_reading_policy': 'syllabus_pinyin records the exact official citation. pinyin preserves the recorded lexical pronunciation and compatible existing audio.',
        }
        data.setdefault('changelog', []).append({'version': version, 'date': '2026-11-28', 'changes': [
            f'Reconciled {changed} official serials using the currently linked official PDF; retained legacy_syllabus_id for exact UUID preservation.',
            'Recorded official citation pinyin and homograph/POS labels separately from preserved spoken readings.',
            f'Applied {len(pos_changes)} reviewed POS corrections; only the two 白 examples and its sense gloss change language.']})
        source_raw = encode(data)
        assert len(source_raw) < 9_000_000
        outputs[output_path] = source_raw
        summary = {'level': level, 'previous_source': baseline_path.as_posix(), 'current_source': output_path.as_posix(),
                   'sha256': digest(source_raw), 'entries': len(entries), 'changed_ids': changed,
                   'pos_changes': pos_changes, 'word_recordings': sum(bool(b['audio']) for b in bindings if b['level'] == level)}

        new_audio_path = Path(f'importer/data/hsk-audio/level{level}-manifest-{version}.json')
        if level == 1:
            audio = {'version': 1, 'level': 1, 'kind': 'preserved_existing_attachments_inventory',
                     'handoff': {'file': output_path.name, 'sha256': digest(source_raw)},
                     'provenance': {'bindings_path': BINDINGS.as_posix(), 'sha256': digest(bindings_raw),
                                    'note': 'Preserves existing attributed attachments; not a new source-reading or listening certification.'},
                     'entries': []}
            for e in data['entries']:
                old = runtime_by_old[e['legacy_syllabus_id']]
                audio['entries'].append({'entryId': old['uuid'], 'hskIndex': e['id'], 'previousHskIndex': old['legacy_id'],
                                         'headword': e['headword'], 'reading': e['pinyin'], 'audio': old['audio']})
        else:
            old_audio_path = Path(f'importer/data/hsk-audio/level{level}-manifest.json')
            old_audio_raw = (ROOT / old_audio_path).read_bytes()
            audio = json.loads(old_audio_raw)
            old_rows = {r['hskIndex']: r for r in audio['entries']}
            if 'compatibleHandoffs' in audio:
                audio['previousCompatibleHandoffs'] = audio.pop('compatibleHandoffs')
            if 'handoff' in audio:
                audio['previousHandoff'] = audio['handoff']
            audio['handoff'] = {'file': output_path.name, 'sha256': digest(source_raw)}
            if level == 2:
                audio['handoffSha256'] = digest(source_raw)
            audio['numberingRevision'] = {'name': 'official-site-1219', 'previousManifest': {
                'path': old_audio_path.as_posix(), 'sha256_lf': digest(old_audio_raw.replace(b'\r\n', b'\n'))}}
            audio['entries'] = []
            for e in data['entries']:
                previous = old_rows[e['legacy_syllabus_id']]
                assert (previous['entryId'], previous['headword'], previous['reading']) == (
                    runtime_by_old[e['legacy_syllabus_id']]['uuid'], e['headword'], e['pinyin'])
                current = copy.deepcopy(previous)
                current['previousHskIndex'], current['hskIndex'] = previous['hskIndex'], e['id']
                audio['entries'].append(current)
        audio_raw = encode(audio)
        outputs[new_audio_path] = audio_raw
        summary['audio_manifest'] = {'path': new_audio_path.as_posix(), 'sha256': digest(audio_raw)}
        summaries.append(summary)
    assert sum(s['changed_ids'] for s in summaries) == 1092
    assert sum(s['word_recordings'] for s in summaries) == 2988
    outputs[AUDIT] = encode({'schema_version': 'hsk-official-numbering-migration/1.0.0', 'levels': summaries,
                             'changed_ids': 1092, 'preserved_word_recordings': 2988, 'rewritten_examples': 2,
                             'lesson_binding_policy': 'Canonical lesson source IDs remain exact; explicit legacy-number adapters resolve current vocabulary.'})
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for relative, raw in build().items():
        path = ROOT / relative
        if args.write:
            path.write_bytes(raw)
        else:
            assert path.read_bytes() == raw, relative
    print(('Wrote' if args.write else 'Checked') + ' five versioned handoffs/audio bindings; 1092 remaps, 2988 preserved recordings.')


if __name__ == '__main__':
    main()
