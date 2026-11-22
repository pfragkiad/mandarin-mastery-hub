"""Apply the supplied partial editorial review without changing imported Chinese.

python scripts/import-shuowen-review.py reports/shuowen-review-handoff.zip --write
python scripts/import-shuowen-review.py --check
"""
import argparse
import copy
from collections import Counter
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'importer/data/etymology/translations/review'
REVIEW_ID = 'shuowen-editorial-2026-11-22'
FOLLOWUP_ID = 'shuowen-uncertainty-followup-v2'
FULL_V2_ID = 'shuowen-full-uncertainty-review-v2'
EXTERNAL_V3_ID = 'shuowen-external-review-v3'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def decode_field(text):
    escapes = {'r': '\r', 'n': '\n', 't': '\t', 'v': '\v', 'f': '\f', '\\': '\\', '|': '|'}
    return re.sub(r'\\(u0085|u2028|u2029|[rntvf\\|])',
                  lambda match: chr(int(match[1][1:], 16)) if match[1].startswith('u') else escapes[match[1]], text)


def parse_export(raw, require_complete=True):
    records = {}
    for line in raw.decode('utf-8-sig').splitlines():
        if not line.startswith('KEY: '):
            continue
        fields = line.split('    ||    ')
        if len(fields) != 3 or not fields[1].startswith('CHINESE: '):
            raise ValueError('Malformed review export row')
        key = fields[0][5:]
        if not re.fullmatch(r'shuowen:[1-9][0-9]*', key) or key in records:
            raise ValueError(f'Duplicate or invalid review key: {key}')
        chinese = fields[1][9:]
        headword, text = chinese.split(' — ', 1)
        uncertain = fields[2].startswith('ENGLISH DRAFT [UNCERTAIN]: ')
        prefix = 'ENGLISH DRAFT [UNCERTAIN]: ' if uncertain else 'ENGLISH DRAFT: '
        if not fields[2].startswith(prefix):
            raise ValueError(f'Malformed English draft label: {key}')
        english = fields[2][len(prefix):]
        if len(decode_field(headword)) != 1 or not english.strip():
            raise ValueError(f'Invalid review headword or empty English: {key}')
        records[key] = {'headword': decode_field(headword), 'text': decode_field(text),
                        'english': decode_field(english), 'uncertain': uncertain,
                        'rawChinese': chinese, 'rawEnglish': english}
    if list(records) != sorted(records, key=lambda key: int(key.split(':')[1])):
        raise ValueError('Review keys must remain in numeric order')
    if require_complete and list(records) != [f'shuowen:{number}' for number in range(1, 9834)]:
        raise ValueError('Review must retain all 9,833 unique keys in numeric order')
    return records


def read_archive(raw, originals):
    """Check the handoff's own before/after evidence, never execute ZIP contents."""
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate archive members')
        before = parse_export(archive.read('shuowen-english-review.txt'))
        after_raw = archive.read('shuowen-english-corrected.txt')
        after = parse_export(after_raw)
        statistics = json.loads(archive.read('shuowen-final-review-statistics.json'))
        differences = list(csv.DictReader(io.StringIO(archive.read('shuowen-reviewed-entry-diff.csv').decode('utf-8-sig'))))
        restorations = list(csv.DictReader(io.StringIO(archive.read('shuowen-source-restorations.csv').decode('utf-8-sig'))))
        operations = [json.loads(line) for line in archive.read('shuowen-editorial-changes.jsonl').decode('utf-8-sig').splitlines() if line.strip()]
        member_hashes = {name: digest(archive.read(name)) for name in names}
    if set(before) != set(originals):
        raise ValueError('Review key set differs from original corpus')
    changed = {}
    source_changes = {}
    for key, old in before.items():
        original = originals[key]
        if (old['headword'], old['text']) != (original['headword'], original['text']):
            raise ValueError(f'Review baseline Chinese differs from pinned original: {key}')
        new = after[key]
        changes = []
        if old['english'] != new['english']:
            changes.append('translation')
        if old['uncertain'] != new['uncertain']:
            changes.append('uncertainty')
        if (old['headword'], old['text']) != (new['headword'], new['text']):
            changes.append('source-reading')
            source_changes[key] = new
        if changes:
            changed[key] = {'reviewId': REVIEW_ID, 'status': 'partial-editorial-review', 'changes': changes}
    actual = {'entries': len(after), 'initial_uncertainties': sum(row['uncertain'] for row in before.values()),
              'remaining_uncertainties': sum(row['uncertain'] for row in after.values()),
              'source_edited_entries': len(source_changes),
              'translation_edited_entries': sum('translation' in row['changes'] for row in changed.values()),
              'resolved_flags': sum(before[key]['uncertain'] and not row['uncertain'] for key, row in after.items()),
              'overall_changed_entries': len(changed), 'source_patch_operations': len(restorations),
              'additional_translation_operations': sum(row['field'] == 'ENGLISH' for row in operations),
              'edited_export_sha256': digest(after_raw)}
    if any(statistics.get(key) != value for key, value in actual.items()):
        raise ValueError('Review statistics or corrected export checksum mismatch')
    if Counter(row['key'] for row in operations if row['field'] == 'CHINESE') != Counter(row['key'] for row in restorations):
        raise ValueError('Editorial operation log disagrees with Chinese apparatus')
    if {row['key'] for row in differences} != set(changed) or len(differences) != len(changed):
        raise ValueError('Review diff does not cover exactly the changed IDs')
    for row in differences:
        key = row['key']
        old, new = before[key], after[key]
        expected = {'original_chinese': old['rawChinese'], 'working_chinese': new['rawChinese'],
                    'original_english': old['rawEnglish'], 'corrected_english': new['rawEnglish'],
                    'original_uncertain': str(int(old['uncertain'])), 'working_uncertain': str(int(new['uncertain'])),
                    'changed_source': str(int(key in source_changes)),
                    'changed_translation': str(int(old['english'] != new['english']))}
        if any(row.get(field) != value for field, value in expected.items()):
            raise ValueError(f'Review diff disagrees with working copy: {key}')
    if {row['key'] for row in restorations} != set(source_changes) or len(restorations) != len(source_changes):
        raise ValueError('Chinese reading apparatus does not match source changes')
    for row in restorations:
        key = row['key']
        if row['source_before'] not in before[key]['rawChinese'] or before[key]['rawChinese'].replace(row['source_before'], row['source_after']) != after[key]['rawChinese']:
            raise ValueError(f'Chinese reading patch does not reconstruct edited source: {key}')
        urls = [url.strip() for url in row['evidence_urls'].split(';') if url.strip()]
        if any(urlparse(url).scheme not in ('http', 'https') for url in urls):
            raise ValueError(f'Invalid evidence URL: {key}')
        reading = after[key]
        changed[key]['sourceReading'] = {'headword': reading['headword'], 'text': reading['text'],
            'textSha256': digest(reading['text'].encode('utf-8')), 'classification': row['classification'],
            'note': row['why'], 'evidenceUrls': urls}
    return {'before': before, 'after': after, 'changes': changed, 'statistics': actual,
            'members': member_hashes, 'archiveSha256': digest(raw)}


def manifest_for(review):
    return {'format': 'mandarin-shuowen-editorial-review', 'schemaVersion': 1,
            'dataset_metadata': {'source_name': 'User-supplied Shuowen editorial review handoff',
                'version': '1.0.0', 'review_id': REVIEW_ID, 'review_date': '2026-11-22',
                'status': 'partial-editorial-review',
                'disclaimer': 'Partial editorial corrections, not full philological certification. Original Chinese and headword associations are preserved; alternative readings are explicitly separate.'},
            'archive': {'file': 'handoff.zip', 'sha256': review['archiveSha256'], 'members': review['members']},
            'statistics': review['statistics']}


def batch_reference(review):
    result = {'review_id': REVIEW_ID, 'archive_sha256': review['archiveSha256'], 'status': 'partial-editorial-review'}
    if 'followup' in review:
        result['followup'] = {'review_id': FOLLOWUP_ID, 'archive_sha256': review['followup']['archiveSha256'],
                              'status': 'partial-editorial-review'}
        if 'fullV2' in review:
            result['followup']['full_review'] = {'review_id': FULL_V2_ID, 'file_sha256': review['fullV2']['fileSha256'],
                                                 'status': 'partial-editorial-review'}
    if 'externalV3' in review:
        result['external_v3'] = {'review_id': EXTERNAL_V3_ID, 'archive_sha256': review['externalV3']['archiveSha256'],
                                  'status': 'partial-editorial-review'}
    return result


def append_uncertain_followup(review, raw):
    """Apply supplied subset English only; omission never resolves an uncertainty."""
    member = 'shuowen-still-uncertain-only.txt'
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        if archive.namelist() != [member]:
            raise ValueError('Uncertainty follow-up must contain only its named text report')
        report_raw = archive.read(member)
    records = parse_export(report_raw, require_complete=False)
    header = re.search(r'^# Entries: ([0-9]+)', report_raw.decode('utf-8-sig'), re.MULTILINE)
    if not header or int(header[1]) != len(records):
        raise ValueError('Uncertainty report count differs from its records')
    uncertain_before = {key for key, row in review['after'].items() if row['uncertain']}
    changed = {}
    previous = {}
    for key, row in records.items():
        if key not in review['after'] or key not in uncertain_before or not row['uncertain']:
            raise ValueError(f'Unexpected key or resolved flag in still-uncertain report: {key}')
        old = review['after'][key]
        if (row['headword'], row['text']) != (old['headword'], old['text']):
            raise ValueError(f'Follow-up changes Chinese without source apparatus: {key}')
        if row['english'] != old['english']:
            changed[key] = row['english']
            previous[key] = old['english']
    omitted = sorted(uncertain_before - set(records), key=lambda key: int(key.split(':')[1]))
    followup = {'archiveSha256': digest(raw), 'memberSha256': digest(report_raw),
                'previous': previous, 'changedKeys': list(changed), 'reportedKeys': list(records),
                'statistics': {'reported_uncertain_entries': len(records), 'translation_edited_entries': len(changed),
                    'uncertain_before': len(uncertain_before), 'uncertain_after': len(uncertain_before),
                    'resolved_flags': 0, 'omitted_uncertain_keys': omitted}}
    # Validate the entire subset before changing the in-memory working copy.
    for key, english in changed.items():
        review['after'][key]['english'] = english
        editorial = copy.deepcopy(review['changes'].get(key, {}))
        editorial.update(reviewId=FOLLOWUP_ID, status='partial-editorial-review')
        editorial['changes'] = list(dict.fromkeys([*editorial.get('changes', []), 'translation']))
        review['changes'][key] = editorial
    review['followup'] = followup
    return followup


def followup_manifest_for(review):
    followup = review['followup']
    return {'format': 'mandarin-shuowen-uncertainty-followup', 'schemaVersion': 1,
            'dataset_metadata': {'source_name': 'User-supplied still-uncertain-only report', 'version': '1.0.0',
                'review_id': FOLLOWUP_ID, 'status': 'partial-editorial-review',
                'disclaimer': 'Subset English updates only. Every included flag remains uncertain; omitted records are unchanged.'},
            'base_review_archive_sha256': review['archiveSha256'],
            'archive': {'file': 'uncertain-followup.zip', 'sha256': followup['archiveSha256'],
                'member': 'shuowen-still-uncertain-only.txt', 'member_sha256': followup['memberSha256']},
            'changed_keys': followup['changedKeys'], 'statistics': followup['statistics']}


def load_followup(review, directory):
    path = directory / 'uncertain-followup.json'
    if not path.exists():
        if (directory / 'uncertain-followup.zip').exists():
            raise ValueError('Uncertainty follow-up manifest is missing')
        return
    manifest = json.loads(path.read_text(encoding='utf-8'))
    raw = (directory / 'uncertain-followup.zip').read_bytes()
    if digest(raw) != manifest['archive']['sha256']:
        raise ValueError('Uncertainty follow-up archive checksum mismatch')
    append_uncertain_followup(review, raw)
    if manifest != followup_manifest_for(review):
        raise ValueError('Uncertainty follow-up manifest differs from report evidence')


def append_full_v2(review, raw):
    """Use explicit full-file flags; verify the earlier subset is its exact extract."""
    if 'followup' not in review:
        raise ValueError('Full v2 requires its preserved still-uncertain subset')
    records = parse_export(raw)
    reported = set(review['followup']['reportedKeys'])
    changed_english = []
    resolved = []
    marked = []
    previous = {}
    for key, row in records.items():
        old = review['after'][key]
        if (row['headword'], row['text']) != (old['headword'], old['text']):
            raise ValueError(f'Full v2 changes Chinese without source apparatus: {key}')
        if key in reported and (row['english'], row['uncertain']) != (old['english'], True):
            raise ValueError(f'Full v2 disagrees with its still-uncertain extract: {key}')
        if row['english'] != old['english']:
            changed_english.append(key)
        if row['uncertain'] != old['uncertain']:
            (marked if row['uncertain'] else resolved).append(key)
        if row['english'] != old['english'] or row['uncertain'] != old['uncertain']:
            previous[key] = {'english': old['english'], 'uncertain': old['uncertain']}
    if {key for key, row in records.items() if row['uncertain']} != reported:
        raise ValueError('Full v2 uncertain IDs differ from its subset report')
    statistics = {'entries': len(records), 'translation_edited_entries': len(changed_english),
        'uncertain_before': sum(row['uncertain'] for row in review['after'].values()),
        'uncertain_after': sum(row['uncertain'] for row in records.values()),
        'resolved_flags': len(resolved), 'new_uncertain_flags': len(marked), 'changed_entry_count': len(previous)}
    for key in previous:
        row = records[key]
        old = review['after'][key]
        changes = copy.deepcopy(review['changes'].get(key, {}))
        fields = list(changes.get('changes', []))
        if old['english'] != row['english']:
            fields.append('translation')
        if old['uncertain'] != row['uncertain']:
            fields.append('uncertainty')
        changes.update(reviewId=FULL_V2_ID, status='partial-editorial-review', changes=list(dict.fromkeys(fields)))
        review['changes'][key] = changes
        old.update(english=row['english'], uncertain=row['uncertain'])
    review['fullV2'] = {'fileSha256': digest(raw), 'statistics': statistics, 'previous': previous,
                        'changedEnglishKeys': changed_english, 'resolvedKeys': resolved, 'newUncertainKeys': marked}
    return review['fullV2']


def full_v2_manifest_for(review):
    full = review['fullV2']
    return {'format': 'mandarin-shuowen-full-uncertainty-review', 'schemaVersion': 1,
        'dataset_metadata': {'source_name': 'User-supplied complete uncertainty-reviewed v2 working copy',
            'version': '1.0.0', 'review_id': FULL_V2_ID, 'status': 'partial-editorial-review',
            'disclaimer': 'Complete entry coverage with explicitly supplied editorial flags; not full philological certification.'},
        'base_review_archive_sha256': review['archiveSha256'], 'subset_archive_sha256': review['followup']['archiveSha256'],
        'file': {'path': 'uncertainty-reviewed-v2.txt', 'sha256': full['fileSha256']},
        'changed_english_keys': full['changedEnglishKeys'], 'resolved_keys': full['resolvedKeys'],
        'new_uncertain_keys': full['newUncertainKeys'], 'statistics': full['statistics']}


def load_full_v2(review, directory):
    path = directory / 'full-v2.json'
    if not path.exists():
        if (directory / 'uncertainty-reviewed-v2.txt').exists():
            raise ValueError('Full v2 review manifest is missing')
        return
    manifest = json.loads(path.read_text(encoding='utf-8'))
    raw = (directory / 'uncertainty-reviewed-v2.txt').read_bytes()
    if digest(raw) != manifest['file']['sha256']:
        raise ValueError('Full v2 review file checksum mismatch')
    append_full_v2(review, raw)
    if manifest != full_v2_manifest_for(review):
        raise ValueError('Full v2 manifest differs from working-copy evidence')


def append_external_v3(review, raw):
    """Validate the supplied case register, decisions and master; retain their scope."""
    if 'fullV2' not in review:
        raise ValueError('External v3 requires its preserved full v2 baseline')
    members = {'shuowen-884-external-verification-v3.md', 'shuowen-884-reviewed-cases-v3.csv',
               'shuowen-884-resolution-patch-v3.jsonl', 'shuowen-remaining-uncertain-v3.txt',
               'shuowen-english-external-reviewed-v3.txt'}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        if len(archive.namelist()) != len(members) or set(archive.namelist()) != members:
            raise ValueError('External v3 archive has missing or duplicate/unknown members')
        master = parse_export(archive.read('shuowen-english-external-reviewed-v3.txt'))
        remaining = parse_export(archive.read('shuowen-remaining-uncertain-v3.txt'), require_complete=False)
        rows = list(csv.DictReader(io.StringIO(archive.read('shuowen-884-reviewed-cases-v3.csv').decode('utf-8-sig'))))
        patches = [json.loads(line) for line in archive.read('shuowen-884-resolution-patch-v3.jsonl').decode('utf-8-sig').splitlines() if line.strip()]
        document = archive.read('shuowen-884-external-verification-v3.md').decode('utf-8-sig')
        member_hashes = {name: digest(archive.read(name)) for name in sorted(members)}
    prior = review['after']
    prior_uncertain = {key for key, row in prior.items() if row['uncertain']}
    register = {row['key']: row for row in rows}
    patch_map = {row['key']: row for row in patches}
    if set(register) != prior_uncertain or len(rows) != len(register):
        raise ValueError('External v3 register must cover every prior uncertain ID exactly once')
    if len(patch_map) != len(patches):
        raise ValueError('Duplicate external v3 patch key')
    for key, row in master.items():
        old = prior[key]
        if (row['headword'], row['text']) != (old['headword'], old['text']):
            raise ValueError(f'External v3 changes Chinese without source apparatus: {key}')
        if key not in register and (row['english'], row['uncertain']) != (old['english'], old['uncertain']):
            raise ValueError(f'External v3 changes an entry outside the 884-case register: {key}')
    checked = []
    unchecked = []
    evidence = {}
    changed_english = []
    resolved = []
    previous = {}
    statuses = Counter()
    def boolean(value):
        if value not in ('True', 'False'):
            raise ValueError('External v3 CSV contains a malformed boolean')
        return value == 'True'
    for key, row in register.items():
        old, new = prior[key], master[key]
        status = row['status']
        is_checked = boolean(row['external_checked_this_pass'])
        english_changed = old['english'] != new['english']
        if row['headword'] != old['headword'] or decode_field(row['original_english_v2']) != old['english']:
            raise ValueError(f'External v3 baseline mismatch: {key}')
        if decode_field(row['english_after_v3']) != new['english'] or boolean(row['uncertain_after']) != new['uncertain'] or boolean(row['english_changed_this_pass']) != english_changed:
            raise ValueError(f'External v3 register disagrees with master: {key}')
        urls = [url.strip() for url in row['source_urls'].split(';') if url.strip()]
        if any(urlparse(url).scheme not in ('http', 'https') for url in urls):
            raise ValueError(f'Invalid external v3 evidence URL: {key}')
        statuses[status] += 1
        if status == 'not_checked_this_pass':
            if is_checked or not new['uncertain'] or english_changed or urls:
                raise ValueError(f'Unchecked v3 case was changed or cleared: {key}')
            unchecked.append(key)
            continue
        if status not in ('clear', 'checked_retained', 'revised_retained') or not is_checked or not urls or not row['reviewer_reason'].strip():
            raise ValueError(f'Invalid checked-case evidence: {key}')
        if new['uncertain'] != (status != 'clear') or (status == 'checked_retained' and english_changed):
            raise ValueError(f'External v3 decision disagrees with uncertainty flag: {key}')
        checked.append(key)
        patch = patch_map.get(key)
        if not patch or patch['status'] != status or patch['note'] != row['reviewer_reason'] or patch['source_urls'] != urls or patch['pinyin'] != row['headword_pinyin']:
            raise ValueError(f'External v3 patch evidence differs from CSV: {key}')
        if type(patch['english_changed']) is not bool or type(patch['flag_cleared']) is not bool or patch['english_changed'] != english_changed or patch['flag_cleared'] != (status == 'clear') or decode_field(patch['english_new']) != new['english']:
            raise ValueError(f'External v3 patch differs from master: {key}')
        if english_changed:
            changed_english.append(key)
        if not new['uncertain']:
            resolved.append(key)
        previous[key] = {'english': old['english'], 'uncertain': old['uncertain']}
        evidence[key] = {'decision': status, 'checkedInSuppliedReview': True,
                         'reviewerNote': row['reviewer_reason'], 'sourceUrls': urls}
    if set(patch_map) != set(checked):
        raise ValueError('External v3 patch keys differ from individually checked cases')
    expected_remaining = {key for key, row in master.items() if row['uncertain']}
    if set(remaining) != expected_remaining or any(not row['uncertain'] or (row['headword'], row['text'], row['english']) != (master[key]['headword'], master[key]['text'], master[key]['english']) for key, row in remaining.items()):
        raise ValueError('External v3 remaining-uncertainty extract differs from master')
    statistics = {'entries': len(master), 'uncertain_before': len(prior_uncertain),
        'cases_reported_checked': len(checked), 'resolved_flags': len(resolved),
        'revised_retained': statuses['revised_retained'], 'checked_retained': statuses['checked_retained'],
        'not_checked_this_pass': len(unchecked), 'translation_edited_entries': len(changed_english),
        'changed_entry_count': len(set(changed_english) | set(resolved)),
        'uncertain_after': len(expected_remaining), 'source_edited_entries': 0}
    metrics = {'Originally still uncertain at start': statistics['uncertain_before'],
        'Individually opened and read from public Shuowen repository this pass': len(checked),
        'Uncertainty flags removed, based on an independently examined interpretation': len(resolved),
        'Translations revised with uncertainty retained': statistics['revised_retained'],
        'Individually checked but still unresolved, English unchanged': statistics['checked_retained'],
        'Not individually externally checked in this pass': len(unchecked),
        'English translations changed this pass': len(changed_english),
        'Still uncertain after this pass': len(expected_remaining), 'Chinese strings modified in the master': 0}
    table = {}
    for line in document.split('## Source policy', 1)[0].splitlines():
        if line.startswith('|'):
            cells = [cell.replace('*', '').strip() for cell in line.strip('|').split('|')]
            if len(cells) == 2 and cells[1].isdigit():
                table[cells[0]] = int(cells[1])
    if any(table.get(label) != value for label, value in metrics.items()):
        raise ValueError('External v3 narrative statistics disagree with checked data')
    # Preserve supplied case evidence even for checked cases whose wording/flag stayed the same.
    for key in checked:
        old, new = prior[key], master[key]
        editorial = copy.deepcopy(review['changes'].get(key, {}))
        fields = [*editorial.get('changes', []), 'review-assessment']
        if old['english'] != new['english']:
            fields.append('translation')
        if old['uncertain'] != new['uncertain']:
            fields.append('uncertainty')
        editorial.update(reviewId=EXTERNAL_V3_ID, status='partial-editorial-review',
                         changes=list(dict.fromkeys(fields)), caseEvidence=evidence[key])
        review['changes'][key] = editorial
        old.update(english=new['english'], uncertain=new['uncertain'])
    review['externalV3'] = {'archiveSha256': digest(raw), 'members': member_hashes, 'statistics': statistics,
        'previous': previous, 'checkedKeys': checked, 'uncheckedKeys': unchecked,
        'changedEnglishKeys': changed_english, 'resolvedKeys': resolved}
    return review['externalV3']


def external_v3_manifest_for(review):
    stage = review['externalV3']
    return {'format': 'mandarin-shuowen-external-review-v3', 'schemaVersion': 1,
        'dataset_metadata': {'source_name': 'User-supplied v3 external-verification handoff',
            'version': '1.0.0', 'review_id': EXTERNAL_V3_ID, 'status': 'partial-editorial-review',
            'disclaimer': 'Case-check claims and citations are supplied by the reviewer. They are not a claim that this importer independently verified the sources or the whole corpus.'},
        'baseline_full_v2_sha256': review['fullV2']['fileSha256'],
        'archive': {'file': 'external-v3.zip', 'sha256': stage['archiveSha256'], 'members': stage['members']},
        'checked_keys': stage['checkedKeys'], 'unchecked_keys': stage['uncheckedKeys'],
        'changed_english_keys': stage['changedEnglishKeys'], 'resolved_keys': stage['resolvedKeys'],
        'statistics': stage['statistics']}


def load_external_v3(review, directory):
    path = directory / 'external-v3.json'
    if not path.exists():
        if (directory / 'external-v3.zip').exists():
            raise ValueError('External v3 review manifest is missing')
        return
    manifest = json.loads(path.read_text(encoding='utf-8'))
    raw = (directory / 'external-v3.zip').read_bytes()
    if digest(raw) != manifest['archive']['sha256']:
        raise ValueError('External v3 archive checksum mismatch')
    append_external_v3(review, raw)
    if manifest != external_v3_manifest_for(review):
        raise ValueError('External v3 manifest differs from case evidence')


def load_saved(originals, directory=DIRECTORY):
    path = directory / 'manifest.json'
    if not path.exists():
        return None
    manifest = json.loads(path.read_text(encoding='utf-8'))
    raw = (directory / 'handoff.zip').read_bytes()
    if digest(raw) != manifest['archive']['sha256']:
        raise ValueError('Editorial review archive checksum mismatch')
    review = read_archive(raw, originals)
    if manifest != manifest_for(review):
        raise ValueError('Editorial review manifest differs from archive evidence')
    load_followup(review, directory)
    load_full_v2(review, directory)
    load_external_v3(review, directory)
    return review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path, nargs='?')
    parser.add_argument('--uncertain-followup', type=Path, help='Supplied still-uncertain-only ZIP; retains omitted flags')
    parser.add_argument('--full-v2', type=Path, help='Complete uncertainty-reviewed v2 text; applies its explicit flags')
    parser.add_argument('--external-v3', type=Path, help='V3 case-evidence ZIP with full master and remaining subset')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('etymology_importer', ROOT / 'scripts/import-etymology.py')
    importer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(importer)
    importer.load_downloader().check()
    source_manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
    entries = importer.source_entries(source_manifest)
    originals = {entry['id']: entry for group in entries.values() for entry in group if entry['sourceId'] == 'shuowen'}
    raw = (args.archive or DIRECTORY / 'handoff.zip').read_bytes()
    review = read_archive(raw, originals)
    followup_raw = args.uncertain_followup.read_bytes() if args.uncertain_followup else None
    if followup_raw is not None:
        append_uncertain_followup(review, followup_raw)
    else:
        load_followup(review, DIRECTORY)
    full_v2_raw = args.full_v2.read_bytes() if args.full_v2 else None
    if full_v2_raw is not None:
        append_full_v2(review, full_v2_raw)
    else:
        load_full_v2(review, DIRECTORY)
    external_v3_raw = args.external_v3.read_bytes() if args.external_v3 else None
    if external_v3_raw is not None:
        append_external_v3(review, external_v3_raw)
    else:
        load_external_v3(review, DIRECTORY)
    # Validate every batch before any mutation; accept a repeated import unchanged.
    updates = {}
    seen = set()
    for path in sorted((importer.SOURCES / 'translations/en').glob('*.json')):
        payload = json.loads(path.read_text(encoding='utf-8'))
        if args.check and payload['dataset_metadata'].get('editorial_review') != batch_reference(review):
            raise ValueError(f'Missing or changed batch review provenance: {path.name}')
        for key, draft in payload['translations'].items():
            if key in seen or key not in originals:
                raise ValueError(f'Duplicate or unknown draft: {key}')
            seen.add(key)
            old, new = review['before'][key], review['after'][key]
            if draft['sourceTextSha256'] != digest(originals[key]['text'].encode('utf-8')):
                raise ValueError(f'Stale Chinese binding: {key}')
            current = (draft['text'], draft['uncertain'])
            expected = (new['english'], new['uncertain'])
            previous = review.get('followup', {}).get('previous', {}).get(key, new['english'])
            full_previous = review.get('fullV2', {}).get('previous', {}).get(key)
            full_previous_state = (full_previous['english'], full_previous['uncertain']) if full_previous else expected
            external_previous = review.get('externalV3', {}).get('previous', {}).get(key)
            external_previous_state = (external_previous['english'], external_previous['uncertain']) if external_previous else expected
            if current not in ((old['english'], old['uncertain']), expected, (previous, new['uncertain']), full_previous_state, external_previous_state):
                raise ValueError(f'Draft diverged from both review baseline and corrected copy: {key}')
            if args.check and current != expected:
                raise ValueError(f'Editorial correction not applied: {key}')
            draft.update(text=new['english'], uncertain=new['uncertain'])
        payload['dataset_metadata']['editorial_review'] = batch_reference(review)
        updates[path] = encoded(payload)
    if seen != set(originals):
        raise ValueError('Incomplete English draft collection')
    if args.write:
        DIRECTORY.mkdir(parents=True, exist_ok=True)
        (DIRECTORY / 'handoff.zip').write_bytes(raw)
        (DIRECTORY / 'manifest.json').write_bytes(encoded(manifest_for(review)))
        if followup_raw is not None:
            (DIRECTORY / 'uncertain-followup.zip').write_bytes(followup_raw)
            (DIRECTORY / 'uncertain-followup.json').write_bytes(encoded(followup_manifest_for(review)))
        if full_v2_raw is not None:
            (DIRECTORY / 'uncertainty-reviewed-v2.txt').write_bytes(full_v2_raw)
            (DIRECTORY / 'full-v2.json').write_bytes(encoded(full_v2_manifest_for(review)))
        if external_v3_raw is not None:
            (DIRECTORY / 'external-v3.zip').write_bytes(external_v3_raw)
            (DIRECTORY / 'external-v3.json').write_bytes(encoded(external_v3_manifest_for(review)))
        for path, data in updates.items():
            if path.read_bytes() != data:
                path.write_bytes(data)
    else:
        if load_saved(originals) is None:
            raise ValueError('Saved review provenance is missing')
    print(json.dumps({'mode': 'written' if args.write else 'checked', **review['statistics'],
                      **({'followup': review['followup']['statistics']} if 'followup' in review else {}),
                      **({'full_v2': review['fullV2']['statistics']} if 'fullV2' in review else {}),
                      **({'external_v3': review['externalV3']['statistics']} if 'externalV3' in review else {})}))


if __name__ == '__main__':
    main()
