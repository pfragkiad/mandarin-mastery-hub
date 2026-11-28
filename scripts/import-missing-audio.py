#!/usr/bin/env python3
"""Attach the exact-read recordings in the owner's missing-audio-package.zip.

The preserved manifest covers missing vocabulary and character-reading slots after
HSK's official-ID migration. Source-index exact rows attach directly. Untagged rows
attach only when listening-review.json records an accepted transcript/pronunciation
review for that exact current record and candidate clip; rejected and uncovered rows
stay untouched. The reviewed yán clips replace only the quarantined cmn-syl-yan2 ID.

The external ZIP supplies bytes for verification/upload; media is never committed.
CDN pointers are durable in importer/data/missing-audio/uploads.json. Runtime writes
change only selected word audio, exact character-reading bindings and their provenance.
"""
import argparse
import bz2
import copy
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
import vocabulary_store  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'importer/data/missing-audio'
MANIFEST = INPUT / 'manifest.json'
REVIEW = INPUT / 'listening-review.json'
UPLOADS = INPUT / 'uploads.json'
CATALOG = ROOT / 'public/data/catalog.json'
PROJECT = '0c46b9ee-9d06-49c0-b59e-9197ea6e6754'
SOURCE_NAMES = {
    'shtooka-cmn-balm-hsk1': 'Shtooka Project (cmn-balm-hsk1) / Wei Gao',
    'shtooka-cmn-balm-congcong': 'Shtooka Project (cmn-balm-congcong) / Congcong (傅琮琮)',
    'shtooka-cmn-caen-tan': 'audio-cmn / Shtooka (cmn-caen-tan) / Yue Tan',
}


def audio_source(clip):
    if clip['sourceId'] == 'wikimedia-lingualibre-cmn':
        speaker = clip['speaker'].splitlines()[0].removeprefix('Speaker:').strip()
        return f'Wikimedia Lingua Libre / {speaker}'
    return SOURCE_NAMES[clip['sourceId']]


def read(path):
    return json.loads(Path(path).read_text('utf-8'))


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def reading(value):
    # Formatting is insignificant; tone marks and neutral tone remain exact.
    return re.sub(r"[\s'’]", '', unicodedata.normalize('NFC', value).lower())


def exact_candidate(row):
    candidates = [item for item in row['candidateClips'] if item['matchKind'] == 'exact_headword_and_reading']
    if not candidates:
        raise ValueError(f"No exact source-tagged candidate: {row.get('entryId', row.get('glyph'))}")
    # The package records candidate order. 啦 has two exact sources; the first is
    # deterministic, while an already attached exact whole-word clip takes precedence.
    return candidates[0]['clipId']


def exact_rows(manifest):
    words = [row for row in manifest['words'] if row['status'] == 'matched_exact_reading']
    characters = [row for row in manifest['characters']
                  if row['status'] == 'matched_exact_reading' and row['missingReason'] != 'quarantined_cmn_syl_yan2']
    return words, characters


def reviewed_rows(manifest, review):
    """Resolve only complete, checksum-bound accepted review decisions."""
    if review is None:
        return [], []
    if review.get('schemaVersion') != 1 or review.get('sourceManifestSha256') != sha256(MANIFEST.read_bytes()):
        raise ValueError('Listening review does not bind this preserved manifest')
    outcomes = {(row['kind'], row['owner'], row['clipId']): row for row in review['outcomes']}
    words_by_id = {row['entryId']: row for row in manifest['words']}
    characters_by_glyph = {row['glyph']: row for row in manifest['characters']}

    def accepted(kind, owner, clip_id, transcript, transcript_pinyin):
        outcome = outcomes.get((kind, owner, clip_id))
        if not outcome or outcome['verdict'] != 'accepted' or outcome['transcript'] != transcript \
                or outcome['transcriptPinyin'] != transcript_pinyin:
            raise ValueError(f'Unaccepted or changed listening-review outcome: {kind}:{owner}:{clip_id}')

    words = []
    seen = set()
    for selected in review['words']:
        row = words_by_id.get(selected['entryId'])
        if not row or row['status'] != 'matched_headword_needs_listening_review' or row['entryId'] in seen:
            raise ValueError(f"Invalid reviewed word selection: {selected['entryId']}")
        if (selected['hskLevel'], selected['hskIndex'], selected['simplified'], selected['pinyinDisplay']) != \
                (row['hskLevel'], row['hskIndex'], row['simplified'], row['pinyinDisplay']):
            raise ValueError(f"Reviewed word identity changed: {row['entryId']}")
        if selected['clipId'] not in {item['clipId'] for item in row['candidateClips']}:
            raise ValueError(f"Reviewed clip is not a recorded candidate: {row['entryId']}")
        accepted('word', row['entryId'], selected['clipId'], selected['transcript'], selected['transcriptPinyin'])
        seen.add(row['entryId'])
        words.append((row, selected['clipId']))
    characters = []
    for selected in review['characters']:
        row = characters_by_glyph.get(selected['glyph'])
        if not row or row.get('missingReason') != 'quarantined_cmn_syl_yan2' or selected['reading'] != row['reading']:
            raise ValueError(f"Invalid reviewed character selection: {selected['glyph']}")
        if selected['clipId'] not in {item['clipId'] for item in row['candidateClips']}:
            raise ValueError(f"Reviewed character clip is not a candidate: {row['glyph']}")
        accepted('character', row['glyph'], selected['clipId'], selected['transcript'], selected['transcriptPinyin'])
        characters.append((row, selected['clipId']))
    unresolved_words = {row['entryId'] for row in review['unresolvedWords']}
    unresolved_characters = {row['glyph'] for row in review['unresolvedCharacters']}
    if (len(words), len(unresolved_words), len(characters), len(unresolved_characters)) != (196, 21, 25, 1):
        raise ValueError('Listening review is incomplete: expected 196/21 words and 25/1 character slots')
    if seen & unresolved_words or {row['glyph'] for row, _ in characters} & unresolved_characters or '呀' not in unresolved_characters:
        raise ValueError('Approved and unresolved listening-review rows overlap')
    if any(row['verdict'] == 'accepted' and ((row['kind'] == 'word' and row['owner'] in unresolved_words)
           or (row['kind'] == 'character' and row['owner'] in unresolved_characters)) for row in review['outcomes']):
        raise ValueError('An unresolved row still has an accepted review outcome')
    summary = review['summary']
    if (summary['candidateEvaluations'], summary['acceptedEvaluations'], summary['rejectedEvaluations']) != (
            len(review['outcomes']), sum(row['verdict'] == 'accepted' for row in review['outcomes']),
            sum(row['verdict'] == 'rejected' for row in review['outcomes'])):
        raise ValueError('Listening-review outcome totals do not match the evidence')
    if summary['wordsApproved'] != len(words) or summary['wordsUnresolved'] != len(unresolved_words) \
            or review['summary']['characterSlotsApproved'] != len(characters) \
            or review['summary']['characterSlotsUnresolved'] != len(unresolved_characters):
        raise ValueError('Listening-review summary does not match its decisions')
    return words, characters


def attachment_targets(manifest, review):
    exact_words, exact_characters = exact_rows(manifest)
    reviewed_words, reviewed_characters = reviewed_rows(manifest, review)
    words = [(row, exact_candidate(row), False) for row in exact_words] + [(row, clip, True) for row, clip in reviewed_words]
    characters = [(row, exact_candidate(row), False) for row in exact_characters] + [(row, clip, True) for row, clip in reviewed_characters]
    return words, characters


def verify_source_readings(manifest):
    """Re-derive every exact candidate from the preserved Shtooka XML indexes."""
    indexes = {}
    for source_id, filename in (
        ('shtooka-cmn-balm-hsk1', 'cmn-balm-hsk1-index.xml'),
        ('shtooka-cmn-caen-tan', 'cmn-caen-tan-index.xml.bz2'),
    ):
        root = ET.fromstring(bz2.decompress((INPUT / 'notices' / filename).read_bytes()))
        indexes[source_id] = {
            path.name: (tag.get('swac_text'), tag.get('swac_pron_phon'))
            for file in root.findall('.//file') if (tag := file.find('tag')) is not None
            for path in [Path(file.get('path'))]
        }
    checked = set()
    for group in ('words', 'characters'):
        for row in manifest[group]:
            for candidate in row['candidateClips']:
                if candidate['matchKind'] != 'exact_headword_and_reading':
                    continue
                clip_id = candidate['clipId']
                clip = manifest['clips'][clip_id]
                expected = indexes[clip['sourceId']].get(clip['sourceFile'])
                term = row.get('simplified', row.get('glyph'))
                pronunciation = row.get('pinyinDisplay', row.get('reading'))
                if expected is None or reading(expected[0]) != reading(term) or reading(expected[1]) != reading(pronunciation):
                    raise ValueError(f'Exact source index mismatch: {clip_id}')
                if (clip['recordedTerm'], reading(clip['recordedReading'])) != (term, reading(pronunciation)):
                    raise ValueError(f'Clip identity differs from its row: {clip_id}')
                checked.add(clip_id)
    if len(checked) != 10:  # Unique exact clips; shared word/character rows deduplicate here.
        raise ValueError(f'Unexpected exact-candidate coverage: {len(checked)}')
    return len(checked)


def verify_package(package):
    """Check preserved source bytes and every packaged clip, including unused clips."""
    package = Path(package)
    for relative in ('manifest.json', 'ATTRIBUTION.md'):
        if (package / relative).read_bytes() != (INPUT / relative).read_bytes():
            raise ValueError(f'External package differs from preserved input: {relative}')
    if (package / 'README.md').read_bytes() != (INPUT / 'PACKAGE_README.md').read_bytes():
        raise ValueError('External package README differs from preserved input')
    for notice in (INPUT / 'notices').iterdir():
        if notice.is_file() and (package / 'notices' / notice.name).read_bytes() != notice.read_bytes():
            raise ValueError(f'External source notice differs: {notice.name}')
    manifest = read(MANIFEST)
    for clip_id, clip in manifest['clips'].items():
        data = (package / clip['archivePath']).read_bytes()
        blob = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        if (len(data) != clip['bytes'] or sha256(data) != clip['sha256']
                or hashlib.sha1(data).hexdigest() != clip['sha1'] or blob != clip['gitBlob']):
            raise ValueError(f'Package audio checksum mismatch: {clip_id}')
    return len(manifest['clips'])


def pointer_for(uploads, blob):
    if not uploads:
        return None
    if isinstance(uploads, dict):
        return uploads.get(blob)
    uploads = Path(uploads)
    if uploads.is_file():
        return read(uploads).get(blob)
    path = uploads / f'{blob}.json'
    return read(path) if path.exists() else None


def uploaded_audio(pointer, clip):
    if (pointer.get('project_id') != PROJECT or pointer.get('size') != clip['bytes']
            or pointer.get('content_type') != clip['mimeType'] or clip['mimeType'] not in ('audio/mpeg', 'audio/wav')):
        raise ValueError('Uploaded project, size or media type differs from the recording')
    if not re.fullmatch(r'/__l5e/assets-v1/[0-9a-f-]{36}/[^/]+\.(mp3|wav)', pointer.get('url', '')):
        raise ValueError('Expected an existing Lovable CDN MP3/WAV URL')
    return {
        'url': pointer['url'],
        'source': audio_source(clip),
        'license': clip['license'],
        'recordingKind': 'word',
    }


def validate_current_identities(vocabulary, catalog, manifest):
    by_id = {entry['id']: entry for entry in vocabulary['entries']}
    for row in manifest['words']:
        entry = by_id.get(row['entryId'])
        if not entry:
            raise ValueError(f"Missing current vocabulary UUID: {row['entryId']}")
        current = (entry['hskLevel'], entry['hsk_index'], entry['simplified'], entry['pinyinDisplay'])
        expected = (row['hskLevel'], row['hskIndex'], row['simplified'], row['pinyinDisplay'])
        source = entry.get('hskSource') or {}
        expected_source = row['hskSource']
        source_matches = not expected_source and not source if expected_source is None else (
            source.get('sourceName') == expected_source['sourceName']
            and source.get('sourceVersion') == expected_source['sourceVersion']
            and str(source.get('sourceId')) == str(row['hskIndex']))
        if current != expected or not source_matches:
            raise ValueError(f"Changed current HSK identity/reading: {row['entryId']}")
    character_rows = {row[0]: row for row in read(ROOT / 'public/data/characters.json')['characters']}
    for row in manifest['characters']:
        if row['status'] == 'matched_exact_reading':
            recorded = character_rows.get(row['glyph'])
            recorded_readings = [reading(item) for item in recorded[1].split('/')] if recorded else []
            if reading(row['reading']) not in recorded_readings:
                raise ValueError(f"Changed character-reading slot: {row['glyph']} {row['reading']}")


def import_data(vocabulary, catalog, manifest, uploads=None, review=None):
    """Return changed copies; no source row, HSK ID, meaning or example is edited."""
    validate_current_identities(vocabulary, catalog, manifest)
    verify_source_readings(manifest)
    result = copy.deepcopy(vocabulary)
    catalog_result = copy.deepcopy(catalog)
    targets = {entry['id']: entry for entry in result['entries']}
    words, characters = attachment_targets(manifest, review)
    reviewed_word_count = sum(reviewed for _, _, reviewed in words)
    reviewed_character_count = sum(reviewed for _, _, reviewed in characters)
    report = {
        'wordStatuses': dict(Counter(row['status'] for row in manifest['words'])),
        'characterStatuses': dict(Counter(row['status'] for row in manifest['characters'])),
        'wordsAttached': 0, 'exactWordsAttached': 0, 'reviewedWordsAttached': 0,
        'wordsChanged': 0, 'reusedExistingWords': 0,
        'charactersCoveredByExactWord': 0, 'reviewedCharacterSlotsAttached': 0, 'catalogRecordingsChanged': 0,
        'quarantinedYanReplaced': reviewed_character_count,
        'quarantinedYanUnchanged': sum(row['missingReason'] == 'quarantined_cmn_syl_yan2' for row in manifest['characters']) - reviewed_character_count,
        'listeningReviewUnchanged': sum(row['status'] == 'matched_headword_needs_listening_review' for group in ('words', 'characters') for row in manifest[group]) - reviewed_word_count,
        'pendingUpload': [],
    }
    for row, clip_id, reviewed in words:
        entry = targets[row['entryId']]
        clip = manifest['clips'][clip_id]
        pointer = pointer_for(uploads, clip['gitBlob'])
        if entry.get('audio'):
            attachment = entry['audio']
            report['reusedExistingWords'] += 1
        elif pointer:
            attachment = uploaded_audio(pointer, clip)
        else:
            report['pendingUpload'].append(f"word:{row['entryId']}")
            continue
        if attachment.get('recordingKind') != 'word':
            raise ValueError(f"Not a whole-word recording: {row['entryId']}")
        report['wordsAttached'] += 1
        report['reviewedWordsAttached' if reviewed else 'exactWordsAttached'] += 1
        if not entry.get('audio'):
            entry['audio'] = attachment
            entry['updatedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            report['wordsChanged'] += 1
    for row, clip_id, reviewed in characters:
        # An exact single-character vocabulary recording supplies neutral audio without
        # duplicating catalogue bindings. Quarantined yán must instead be replaced.
        reusable = None if reviewed else next((entry['audio'] for entry in result['entries'] if entry.get('audio')
                          and entry['simplified'] == row['glyph'] and reading(entry['pinyinDisplay']) == reading(row['reading'])
                         and entry['audio'].get('recordingKind') == 'word'), None)
        if reusable:
            report['charactersCoveredByExactWord'] += 1
            continue
        clip = manifest['clips'][clip_id]
        pointer = pointer_for(uploads, clip['gitBlob'])
        if not pointer:
            report['pendingUpload'].append(f"character:{row['glyph']}:{row['reading']}")
            continue
        attachment = uploaded_audio(pointer, clip)
        recording_id = f"supplement-{clip['sha256'][:16]}"
        bindings = catalog_result['readingAudio'].setdefault(row['glyph'], {})
        existing_id = bindings.get(row['reading'])
        may_replace_quarantine = reviewed and existing_id == 'cmn-syl-yan2'
        if existing_id not in (None, recording_id) and not may_replace_quarantine:
            raise ValueError(f"Refusing to replace character recording: {row['glyph']} {row['reading']}")
        existing = catalog_result['audio'].get(recording_id)
        if existing and existing != attachment:
            raise ValueError(f'Conflicting supplemental recording ID: {recording_id}')
        if existing_id != recording_id or existing != attachment:
            catalog_result['audio'][recording_id] = attachment
            bindings[row['reading']] = recording_id
            report['catalogRecordingsChanged'] += 1
        if reviewed:
            report['reviewedCharacterSlotsAttached'] += 1
    return result, catalog_result, report


def required_clips(vocabulary, manifest, review=None):
    """Selected clips not already covered by an attached word; duplicates upload once."""
    needed = {}
    words, characters = attachment_targets(manifest, review)
    entries = vocabulary['entries']
    for row, clip_id, _ in words:
        entry = next(entry for entry in entries if entry['id'] == row['entryId'])
        if not entry.get('audio'):
            clip = manifest['clips'][clip_id]
            needed[clip['clipId']] = clip
    for row, clip_id, reviewed in characters:
        reusable = not reviewed and any(entry.get('audio') and entry['simplified'] == row['glyph']
                       and reading(entry['pinyinDisplay']) == reading(row['reading'])
                       and entry['audio'].get('recordingKind') == 'word' for entry in entries)
        if not reusable:
            clip = manifest['clips'][clip_id]
            needed[clip['clipId']] = clip
    return needed


def detailed_file_report(vocabulary, catalog, manifest, review):
    """Per-clip audit: every supplied file, its references, review and actual attachment."""
    words, characters = attachment_targets(manifest, review)
    entries = {entry['id']: entry for entry in vocabulary['entries']}
    selected_words = {}
    selected_characters = {}
    for row, clip_id, reviewed in words:
        selected_words.setdefault(clip_id, []).append((row, reviewed))
    for row, clip_id, reviewed in characters:
        selected_characters.setdefault(clip_id, []).append((row, reviewed))
    files = []
    for clip_id, clip in sorted(manifest['clips'].items()):
        references = []
        for row in manifest['words']:
            if clip_id in {item['clipId'] for item in row['candidateClips']}:
                references.append({'kind': 'word', 'entryId': row['entryId'], 'hskLevel': row['hskLevel'],
                                   'hskIndex': row['hskIndex'], 'headword': row['simplified'], 'reading': row['pinyinDisplay']})
        for row in manifest['characters']:
            if clip_id in {item['clipId'] for item in row['candidateClips']}:
                references.append({'kind': 'character', 'glyph': row['glyph'], 'reading': row['reading']})
        outcomes = [row for row in review['outcomes'] if row['clipId'] == clip_id]
        attached_to = []
        urls = []
        for row, reviewed in selected_words.get(clip_id, []):
            audio = entries[row['entryId']].get('audio')
            if audio:
                attached_to.append({'kind': 'word', 'entryId': row['entryId'], 'headword': row['simplified'],
                                    'reading': row['pinyinDisplay'], 'reviewed': reviewed})
                urls.append(audio['url'])
        for row, reviewed in selected_characters.get(clip_id, []):
            recording_id = f"supplement-{clip['sha256'][:16]}"
            if catalog['readingAudio'].get(row['glyph'], {}).get(row['reading']) == recording_id:
                attached_to.append({'kind': 'character', 'glyph': row['glyph'], 'reading': row['reading'], 'reviewed': reviewed})
                urls.append(catalog['audio'][recording_id]['url'])
        if attached_to:
            status = 'attached'
        elif outcomes and all(row['verdict'] == 'rejected' for row in outcomes):
            status = 'rejected_listening_review'
        elif any(row['verdict'] == 'accepted' for row in outcomes):
            status = 'reviewed_alternative_not_selected'
        else:
            status = 'alternative_not_selected'
        files.append({'clipId': clip_id, 'sourceId': clip['sourceId'], 'sourceFile': clip['sourceFile'],
                      'archivePath': clip['archivePath'], 'recordedTerm': clip['recordedTerm'],
                      'recordedReading': clip['recordedReading'], 'speaker': clip['speaker'], 'license': clip['license'],
                      'bytes': clip['bytes'], 'sha256': clip['sha256'], 'status': status,
                      'cdnUrls': sorted(set(urls)), 'attachedTo': attached_to, 'references': references,
                      'reviewOutcomes': outcomes})
    word_referenced = {row['clipId'] for row in files if any(ref['kind'] == 'word' for ref in row['references'])}
    character_referenced = {row['clipId'] for row in files if any(ref['kind'] == 'character' for ref in row['references'])}
    return {
        'packageCoverage': {
            'uniqueAudioClips': len(files), 'wordReferencedClips': len(word_referenced),
            'characterReferencedClips': len(character_referenced), 'sharedWordAndCharacterClips': len(word_referenced & character_referenced),
            'unreferencedClips': len(files) - len(word_referenced | character_referenced),
            'attachedUniqueClips': sum(row['status'] == 'attached' for row in files),
            'rejectedUniqueClips': sum(row['status'] == 'rejected_listening_review' for row in files),
            'alternativeUniqueClips': sum(row['status'].endswith('not_selected') for row in files),
        },
        'reviewSidecar': 'importer/data/missing-audio/listening-review.json',
        'reviewMethod': review['reviewMethod'],
        'files': files,
    }


def upload(package, uploads):
    executable = shutil.which('lovable-assets')
    if not executable:
        raise ValueError('lovable-assets is unavailable; no uploads attempted')
    manifest = read(MANIFEST)
    vocabulary = vocabulary_store.read_vocabulary()
    uploads = Path(uploads)
    uploads.mkdir(parents=True, exist_ok=True)
    for clip in required_clips(vocabulary, manifest, read(REVIEW)).values():
        pointer_path = uploads / f"{clip['gitBlob']}.json"
        if pointer_path.exists():
            uploaded_audio(read(pointer_path), clip)
            continue
        path = Path(package) / clip['archivePath']
        data = path.read_bytes()
        if len(data) != clip['bytes'] or sha256(data) != clip['sha256']:
            raise ValueError(f"Cached audio checksum mismatch: {clip['clipId']}")
        extension = 'wav' if clip['mimeType'] == 'audio/wav' else 'mp3'
        filename = f"missing-{clip['sha256'][:16]}.{extension}"
        completed = subprocess.run([executable, 'create', '--file', str(path), '--filename', filename],
                                   check=True, capture_output=True, text=True)
        pointer = json.loads(completed.stdout)
        uploaded_audio(pointer, clip)
        pointer_path.write_text(json.dumps(pointer, indent=2) + '\n', 'utf-8')
        print(f"uploaded {clip['recordedTerm']} {clip['recordedReading']}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--package', type=Path, help='Extracted external package (for byte verification/upload)')
    parser.add_argument('--verify-cache', action='store_true')
    parser.add_argument('--upload', action='store_true')
    parser.add_argument('--uploads', type=Path, default=UPLOADS)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if (args.verify_cache or args.upload) and not args.package:
        parser.error('--package is required for cache verification/upload')
    if args.upload and args.uploads.is_file():
        parser.error('--upload requires an external uploads directory')
    if args.verify_cache:
        print(f'Verified {verify_package(args.package)} package clips')
    if args.upload:
        upload(args.package, args.uploads)
    vocabulary = vocabulary_store.read_vocabulary()
    catalog = read(CATALOG)
    changed, catalog_changed, report = import_data(vocabulary, catalog, read(MANIFEST), args.uploads, read(REVIEW))
    if args.write:
        if report['pendingUpload']:
            raise ValueError(f"Refusing partial import with pending uploads: {report['pendingUpload']}")
        vocabulary_store.write_vocabulary(changed)
        CATALOG.write_text(json.dumps(catalog_changed, ensure_ascii=False, separators=(',', ':')) + '\n', 'utf-8')
    if args.report:
        review = read(REVIEW)
        detailed = detailed_file_report(changed, catalog_changed, read(MANIFEST), review)
        args.report.write_text(json.dumps({**report, **detailed}, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'mode': 'written' if args.write else 'audit-only', **report}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
