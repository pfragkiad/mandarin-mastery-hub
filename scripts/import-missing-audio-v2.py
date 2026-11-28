#!/usr/bin/env python3
"""Second-round audio import: exact source evidence, explicit sandhi and fail-closed holds.

Reuses the first-round CDN validation and split vocabulary store. Review evidence
is separate from runtime data; automated transcripts never certify acoustic tones.
Only selected whole-word attachments change, never character identities or readings.
"""
import argparse
import bz2
import copy
import importlib.util
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('missing_audio', Path(__file__).with_name('import-missing-audio.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
INPUT = base.INPUT / 'v2'
MANIFEST = INPUT / 'manifest.json'
REVIEW = INPUT / 'review.json'
UPLOADS = INPUT / 'uploads.json'
REPORT = base.ROOT / 'reports/missing-audio-v2-import.json'
HOMOPHONE_TRANSCRIPTS = {'一带': '一代', '一向': '一项', '一同': '一瞳'}


def verify_package(package, manifest):
    """Verify every file, including held alternatives, before any upload."""
    for name, target in [('manifest.json', 'manifest.json'), ('ATTRIBUTION.md', 'ATTRIBUTION.md'),
                         ('README.md', 'PACKAGE_README.md')]:
        if (package / name).read_bytes() != (INPUT / target).read_bytes():
            raise ValueError(f'Changed package metadata: {name}')
    for notice in (INPUT / 'notices').iterdir():
        if notice.name == 'README.md':
            continue  # Repository usage guide, not an original package notice.
        if (package / 'notices' / notice.name).read_bytes() != notice.read_bytes():
            raise ValueError(f'Changed source notice: {notice.name}')
    for clip_id, clip in manifest['clips'].items():
        path = (package / clip['archivePath']).resolve()
        if not path.is_relative_to(package.resolve()):
            raise ValueError('Audio path escapes package')
        data = path.read_bytes()
        import hashlib
        blob = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        if (len(data), base.sha256(data), blob) != (clip['bytes'], clip['sha256'], clip['gitBlob']):
            raise ValueError(f'Changed recording bytes: {clip_id}')
    return len(manifest['clips'])


def sandhi_matches(term, source, target):
    """Only an initial 一/不 tone may differ; every remaining syllable stays exact."""
    source, target = base.reading(source), base.reading(target)
    if term.startswith('不') and source.startswith('bù'):
        tail = source[2:]
        first_mark = next((c for c in tail if c in 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'), '')
        return bool(first_mark) and first_mark in 'àèìòùǜ' and target == 'bú' + tail
    if term.startswith('一') and source.startswith('yī'):
        tail = source[2:]
        first_mark = next((c for c in tail if c in 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'), '')
        if not first_mark:
            return False
        return target == ('yí' if first_mark in 'àèìòùǜ' else 'yì') + tail
    return False


def selections(vocabulary, manifest, review):
    base.validate_current_identities(vocabulary, {}, manifest)
    if review['sourceManifestSha256'] != base.sha256(MANIFEST.read_bytes()):
        raise ValueError('Review does not bind the current package')
    evidence = {row['clipId']: row for row in review['transcripts']}
    if set(evidence) != set(manifest['clips']):
        raise ValueError('Incomplete transcription evidence')
    source = ET.fromstring(bz2.decompress((INPUT / 'notices/cmn-caen-tan-index.xml.bz2').read_bytes()))
    index = {Path(row.get('path')).name: row.find('tag').attrib for row in source.findall('.//file')
             if row.find('tag') is not None}
    rows = {row['entryId']: row for row in manifest['words']}
    seen = set()
    if review['characters']:
        raise ValueError('Character tone/identity review is unresolved')
    for selected in review['words']:
        row = rows[selected['entryId']]
        if row['entryId'] in seen:
            raise ValueError('Duplicate word selection')
        seen.add(row['entryId'])
        if any(row[key] != selected[key] for key in ('hskLevel', 'hskIndex', 'simplified', 'pinyinDisplay')):
            raise ValueError('Changed selected identity')
        clip = manifest['clips'][selected['clipId']]
        candidate = next((c for c in row['candidateClips'] if c['clipId'] == selected['clipId']), None)
        if not candidate or candidate['matchKind'] != 'shtooka_yi_bu_sandhi_exception' or clip['sourceId'] != 'shtooka-cmn-caen-tan':
            raise ValueError('Only source-backed initial 一/不 sandhi is eligible')
        tags = index.get(clip['sourceFile'], {})
        if (tags.get('swac_text'), base.reading(tags.get('swac_pron_phon', ''))) != (row['simplified'], base.reading(clip['recordedReading'])):
            raise ValueError('Pinned source headword/reading mismatch')
        if clip['recordedTerm'] != row['simplified'] or not sandhi_matches(row['simplified'], clip['recordedReading'], row['pinyinDisplay']):
            raise ValueError('Not an exact initial-tone sandhi correspondence')
        transcript = evidence[selected['clipId']]
        if transcript['sha256'] != clip['sha256'] or selected['transcript'] != transcript['transcript']:
            raise ValueError('Changed transcription evidence')
        if transcript['transcript'] not in (row['simplified'], HOMOPHONE_TRANSCRIPTS.get(row['simplified'])):
            raise ValueError('Unresolved transcript disagreement')
    return review['words']


def import_data(vocabulary, manifest, review, uploads):
    selected = selections(vocabulary, manifest, review)
    data = copy.deepcopy(vocabulary)
    entries = {e['id']: e for e in data['entries']}
    pending = []
    changed = 0
    for row in selected:
        clip = manifest['clips'][row['clipId']]
        pointer = uploads.get(clip['gitBlob'])
        if not pointer:
            pending.append(row['entryId'])
            continue
        attachment = base.uploaded_audio(pointer, clip)
        entry = entries[row['entryId']]
        if entry.get('audio') not in (None, attachment):
            raise ValueError('Refusing to replace an existing recording')
        if not entry.get('audio'):
            entry['audio'] = attachment
            changed += 1
    return data, {'wordsSelected': len(selected), 'wordsChanged': changed, 'pendingUploads': pending}


def make_report(data, manifest, review, result):
    selected = {r['clipId']: r for r in review['words']}
    entries = {e['id']: e for e in data['entries']}
    transcripts = {r['clipId']: r for r in review['transcripts']}
    files = []
    for clip_id, clip in sorted(manifest['clips'].items()):
        references = []
        for kind, group in [('word', 'words'), ('character', 'characters')]:
            for row in manifest[group]:
                if any(c['clipId'] == clip_id for c in row['candidateClips']):
                    references.append({'kind': kind, **{k: row[k] for k in ('entryId', 'glyph', 'hskIndex', 'hskLevel', 'simplified', 'pinyinDisplay', 'reading') if k in row}})
        row = selected.get(clip_id)
        audio = entries[row['entryId']].get('audio') if row else None
        files.append({**clip, 'status': 'attached' if audio else 'held_for_reading_review',
                      'transcriptionEvidence': transcripts[clip_id], 'references': references,
                      'attachedTo': [row['entryId']] if audio else [], 'cdnUrl': audio['url'] if audio else None,
                      'holdReason': None if audio else 'Neutral/citation, partial-reading, interjection or transcript disagreement; no acoustic tone certification. Alternatives remain unselected.'})
    selected_ids = {r['entryId'] for r in review['words']}
    return {**result, 'sourceManifestSha256': review['sourceManifestSha256'], 'reviewMethod': review['reviewMethod'],
            'packageCoverage': {'uniqueClips': len(files), 'attachedClips': sum(f['status'] == 'attached' for f in files),
                                'heldOrAlternativeClips': sum(f['status'] != 'attached' for f in files)},
            'wordCandidatesHeld': [r for r in manifest['words'] if r['candidateClips'] and r['entryId'] not in selected_ids],
            'characterCandidatesHeld': [r for r in manifest['characters'] if r['candidateClips']],
            'uncoveredWords': sum(not r['candidateClips'] for r in manifest['words']),
            'uncoveredCharacterSlots': sum(not r['candidateClips'] for r in manifest['characters']),
            'recordingsByLevel': dict(sorted(Counter(e['hskLevel'] for e in data['entries'] if e.get('audio') and e['hskLevel']).items())),
            'files': files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path)
    parser.add_argument('--upload', action='store_true')
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path, default=REPORT)
    args = parser.parse_args()
    manifest, review = base.read(MANIFEST), base.read(REVIEW)
    vocabulary = base.vocabulary_store.read_vocabulary()
    selected = selections(vocabulary, manifest, review)
    uploads = base.read(UPLOADS) if UPLOADS.exists() else {}
    if args.package:
        print('Verified clips:', verify_package(args.package, manifest))
    if args.upload:
        if not args.package:
            parser.error('--upload requires --package')
        for row in selected:
            clip = manifest['clips'][row['clipId']]
            if clip['gitBlob'] not in uploads:
                output = subprocess.run(['lovable-assets', 'create', '--file', str(args.package / clip['archivePath']),
                                         '--filename', f"missing-{clip['sha256'][:16]}.mp3"], check=True, capture_output=True, text=True)
                pointer = json.loads(output.stdout)
                base.uploaded_audio(pointer, clip)
                uploads[clip['gitBlob']] = pointer
                UPLOADS.write_text(json.dumps(uploads, indent=2) + '\n')
                print('Uploaded', row['simplified'], flush=True)
    data, result = import_data(vocabulary, manifest, review, uploads)
    if args.write:
        if result['pendingUploads']:
            raise ValueError('Refusing a partial import')
        base.vocabulary_store.write_vocabulary(data)
    args.report.write_text(json.dumps(make_report(data, manifest, review, result), ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()