#!/usr/bin/env python3
"""Audit exact Level 2 readings against Shtooka, then attach verified CDN recordings.

--prepare --cache DIR pins source metadata and downloads checksum-verified audio-cmn
MP3s outside the repository. --upload --cache DIR --uploads DIR resumes the existing
lovable-assets workflow. --write attaches available uploads/existing exact word clips;
missing or different readings stay empty. No words, examples or source IDs are replaced.
--stage copies verified clips into the owner-requested importer handoff for Lovable.
"""
import argparse
import bz2
import concurrent.futures
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
import vocabulary_store  # noqa: E402  (split-by-level vocabulary reader/writer)

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'importer/data/hsk-audio'
VOCABULARY = vocabulary_store.DIRECTORY
HANDOFF = ROOT / 'importer/hsk/archive/hsk3_level2_1.0.2.json'
COMMIT = 'f759a0f18f27690742957619e1248ed91e9b3f2c'
BASE = 'https://fsi-languages.yojik.eu/audiocollections/detailled/cmn-caen-tan/'
INDEX_SHA256 = '59052c11fcdfd0f0f21fcaf9618371f269f4a0228eaed920c3923e827f8d81a6'
SOURCE = 'audio-cmn / Shtooka (cmn-caen-tan) / Yue Tan'
LICENSE = 'CC BY-SA 3.0 US'
PROJECT = '0c46b9ee-9d06-49c0-b59e-9197ea6e6754'


def read(path):
    return json.loads(Path(path).read_text('utf-8'))


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'mandarin-mastery-hub-audio-import'})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def reading(value):
    # Only orthographic spacing/apostrophes/case are ignored. Tones remain exact,
    # including neutral tone: guo must never inherit the recording for guò.
    return re.sub(r"[\s'’]", '', unicodedata.normalize('NFC', value).lower())


def source_index(raw):
    if sha256(raw) != INDEX_SHA256:
        raise ValueError('Shtooka metadata checksum mismatch')
    root = ET.fromstring(bz2.decompress(raw))
    group = root.find('group')
    if group.get('swac_coll_copyright') != '(c) 2009 Yue Tan' or group.get('swac_coll_license') != 'Creative Commons BY-SA 3.0 U.S':
        raise ValueError('Unexpected source attribution')
    result = {}
    for file in root.findall('.//file'):
        tag = file.find('tag')
        row = {'reading': tag.get('swac_pron_phon'), 'file': file.get('path')}
        result.setdefault(tag.get('swac_text'), []).append(row)
    return result


def match(entry, index):
    candidates = index.get(entry['simplified'], [])
    exact = [item for item in candidates if reading(item['reading']) == reading(entry['pinyinDisplay'])]
    status = 'matched' if len(exact) == 1 else 'ambiguous' if exact else 'reading_mismatch' if candidates else 'missing'
    return {'entryId': entry['id'], 'hskIndex': entry['hsk_index'], 'headword': entry['simplified'],
            'reading': entry['pinyinDisplay'], 'status': status, 'sourceCandidates': candidates}


def prepare(cache):
    INPUT.mkdir(parents=True, exist_ok=True)
    index_raw = fetch(BASE + 'mp3/index.xml')  # The source serves bzip2 at this exact URL.
    index = source_index(index_raw)
    notice = fetch(BASE + 'readme.txt')
    tree = json.loads(fetch(f'https://api.github.com/repos/hugolpz/audio-cmn/git/trees/{COMMIT}?recursive=1'))
    if tree.get('truncated'):
        raise ValueError('Incomplete audio-cmn tree')
    files = {item['path']: item for item in tree['tree'] if item['type'] == 'blob'}
    vocabulary = vocabulary_store.read_vocabulary(VOCABULARY)
    entries = [entry for entry in vocabulary['entries'] if entry['hskLevel'] == 2]
    handoff = read(HANDOFF)
    if {(entry['hsk_index'], entry['simplified'], entry['pinyinDisplay']) for entry in entries} != {
            (entry['id'], entry['headword'], entry['pinyin']) for entry in handoff['entries']} or len(entries) != 200:
        raise ValueError('Level 2 identities/readings differ from the pinned handoff')
    rows = [match(entry, index) for entry in entries]
    for row in rows:
        if row['status'] != 'matched':
            continue
        path = f"64k/hsk/cmn-{row['headword']}.mp3"
        if path not in files:
            row['status'] = 'missing_audio_file'
            continue
        row['recording'] = {'path': path, 'gitBlob': files[path]['sha'], 'bytes': files[path]['size']}
    cache.mkdir(parents=True, exist_ok=True)

    def download(recording):
        path = cache / (recording['gitBlob'] + '.mp3')
        url = f"https://raw.githubusercontent.com/hugolpz/audio-cmn/{COMMIT}/" + urllib.parse.quote(recording['path'])
        data = path.read_bytes() if path.exists() else fetch(url)
        git_hash = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        if len(data) != recording['bytes'] or git_hash != recording['gitBlob']:
            raise ValueError(f"Recording bytes differ from the pinned Git blob: {recording['path']}")
        path.write_bytes(data)
        return recording['gitBlob'], sha256(data)

    unique = {row['recording']['gitBlob']: row['recording'] for row in rows if row['status'] == 'matched'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        checksums = dict(pool.map(download, unique.values()))
    for row in rows:
        if row['status'] == 'matched':
            row['recording']['sha256'] = checksums[row['recording']['gitBlob']]
    (INPUT / 'cmn-caen-tan-index.xml.bz2').write_bytes(index_raw)
    (INPUT / 'cmn-caen-tan-readme.txt').write_bytes(notice)
    manifest = {'version': 1, 'source': {'name': SOURCE, 'license': LICENSE,
                'repository': 'https://github.com/hugolpz/audio-cmn', 'commit': COMMIT, 'quality': '64k/hsk',
                'metadataUrl': BASE + 'mp3/index.xml', 'metadataSha256': sha256(index_raw),
                'noticeUrl': BASE + 'readme.txt', 'noticeSha256': sha256(notice)},
                'handoffSha256': sha256(HANDOFF.read_bytes()), 'entries': rows}
    (INPUT / 'level2-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    return manifest


def load_manifest():
    manifest = read(INPUT / 'level2-manifest.json')
    index = source_index((INPUT / 'cmn-caen-tan-index.xml.bz2').read_bytes())
    if manifest['source']['commit'] != COMMIT or manifest['handoffSha256'] != sha256(HANDOFF.read_bytes()):
        raise ValueError('Manifest source/handoff differs from the pinned inputs')
    if manifest['source']['noticeSha256'] != sha256((INPUT / 'cmn-caen-tan-readme.txt').read_bytes()):
        raise ValueError('Source notice checksum mismatch')
    for row in manifest['entries']:
        expected = match({'id': row['entryId'], 'hsk_index': row['hskIndex'], 'simplified': row['headword'], 'pinyinDisplay': row['reading']}, index)
        if row['sourceCandidates'] != expected['sourceCandidates'] or row['status'] != expected['status']:
            raise ValueError(f"Manifest does not match the preserved source metadata: {row['hskIndex']}")
    return manifest


def uploaded_audio(pointer, recording):
    if pointer.get('project_id') != PROJECT or pointer.get('size') != recording['bytes'] or pointer.get('content_type') != 'audio/mpeg':
        raise ValueError('Uploaded project, size or media type differs from the recording')
    if not re.fullmatch(r'/__l5e/assets-v1/[0-9a-f-]{36}/[^/]+\.mp3', pointer.get('url', '')):
        raise ValueError('Expected an existing Lovable CDN MP3 URL')
    return {'url': pointer['url'], 'source': SOURCE, 'license': LICENSE, 'recordingKind': 'word'}


def import_audio(vocabulary, manifest, uploads=None):
    by_id = {entry['id']: entry for entry in vocabulary['entries'] if entry['hskLevel'] == 2}
    if len(by_id) != 200 or len(manifest['entries']) != 200 or {row['entryId'] for row in manifest['entries']} != set(by_id):
        raise ValueError('Level 2 record identities are incomplete')
    result = json.loads(json.dumps(vocabulary))
    targets = {entry['id']: entry for entry in result['entries']}
    report = {'matched': 0, 'missing': 0, 'reading_mismatch': 0, 'ambiguous': 0, 'missing_audio_file': 0,
              'attached': 0, 'reusedExisting': 0, 'pendingUpload': [], 'changed': 0}
    for row in manifest['entries']:
        entry = by_id[row['entryId']]
        if (entry['hsk_index'], entry['simplified'], entry['pinyinDisplay']) != (row['hskIndex'], row['headword'], row['reading']):
            raise ValueError(f"Changed Level 2 identity/reading: {row['hskIndex']}")
        report[row['status']] += 1
        if row['status'] != 'matched':
            continue
        exact = [item for item in row['sourceCandidates'] if reading(item['reading']) == reading(row['reading'])]
        if len(exact) != 1:
            raise ValueError('Matched recording does not have one exact source reading')
        # A trusted existing whole-word attachment can be reused only for this exact
        # written form and reading. Never stitch syllables or borrow a different tone.
        reusable = next((item['audio'] for item in vocabulary['entries'] if item.get('audio')
                         and item['simplified'] == row['headword'] and reading(item['pinyinDisplay']) == reading(row['reading'])
                         and item['audio'].get('source') == SOURCE and item['audio'].get('recordingKind') == 'word'), None)
        pointer_path = uploads / (row['recording']['gitBlob'] + '.json') if uploads else None
        if reusable:
            attachment = reusable
            report['reusedExisting'] += 1
        elif pointer_path and pointer_path.exists():
            attachment = uploaded_audio(read(pointer_path), row['recording'])
        else:
            report['pendingUpload'].append(row['hskIndex'])
            continue
        if entry.get('audio') and entry['audio'] != attachment:
            raise ValueError(f"Refusing to replace an existing attachment: {row['hskIndex']}")
        report['attached'] += 1
        if entry.get('audio') != attachment:
            targets[entry['id']]['audio'] = attachment
            targets[entry['id']]['updatedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            report['changed'] += 1
    return result, report


def stage(manifest, cache):
    # Explicit owner-requested handoff exception: temporary source MP3s are kept
    # under this one importer directory until Lovable has uploaded them to its CDN.
    destination = INPUT / 'recordings'
    destination.mkdir(parents=True, exist_ok=True)
    recordings = {row['recording']['gitBlob']: row['recording'] for row in manifest['entries'] if row['status'] == 'matched'}
    for blob, recording in recordings.items():
        source = cache / (blob + '.mp3')
        raw = source.read_bytes()
        if len(raw) != recording['bytes'] or sha256(raw) != recording['sha256']:
            raise ValueError(f'Cached audio checksum mismatch: {source.name}')
        if source.resolve() != (destination / source.name).resolve():
            shutil.copyfile(source, destination / source.name)
    return len(recordings)


def upload(manifest, cache, uploads):
    executable = shutil.which('lovable-assets')
    if not executable:
        raise ValueError('lovable-assets is unavailable; no uploads attempted')
    uploads.mkdir(parents=True, exist_ok=True)
    _, coverage = import_audio(vocabulary_store.read_vocabulary(VOCABULARY), manifest, uploads)
    pending = set(coverage['pendingUpload'])
    for recording in {row['recording']['gitBlob']: row['recording'] for row in manifest['entries'] if row['hskIndex'] in pending}.values():
        pointer_path = uploads / (recording['gitBlob'] + '.json')
        if pointer_path.exists():
            uploaded_audio(read(pointer_path), recording)
            continue
        path = cache / (recording['gitBlob'] + '.mp3')
        data = path.read_bytes()
        if len(data) != recording['bytes'] or sha256(data) != recording['sha256']:
            raise ValueError(f'Cached audio checksum mismatch: {path.name}')
        completed = subprocess.run([executable, 'create', '--file', str(path), '--filename', f"hsk2-{recording['sha256'][:16]}.mp3"], check=True, capture_output=True, text=True)
        pointer = json.loads(completed.stdout)
        uploaded_audio(pointer, recording)
        pointer_path.write_text(json.dumps(pointer, indent=2) + '\n', 'utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--stage', action='store_true')
    parser.add_argument('--cache', type=Path)
    parser.add_argument('--upload', action='store_true')
    parser.add_argument('--uploads', type=Path)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.prepare or args.upload or args.stage:
        if not args.cache or ((ROOT == args.cache.resolve() or ROOT in args.cache.resolve().parents)
                              and args.cache.resolve() != (INPUT / 'recordings').resolve()):
            parser.error('--cache must be external or the owner-approved importer/data/hsk-audio/recordings handoff')
    if args.upload and not args.uploads:
        parser.error('--upload requires --uploads')
    manifest = prepare(args.cache) if args.prepare else load_manifest()
    if args.stage:
        print(f'Staged {stage(manifest, args.cache)} verified MP3s for Lovable')
    if args.upload:
        upload(manifest, args.cache, args.uploads)
    data, report = import_audio(vocabulary_store.read_vocabulary(VOCABULARY), manifest, args.uploads)
    if args.write:
        vocabulary_store.write_vocabulary(data, VOCABULARY)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'mode': 'written' if args.write else 'audit-only', **report}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
