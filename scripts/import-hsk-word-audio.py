#!/usr/bin/env python3
"""Attach verified HSK Level 3/4 word recordings from owner-supplied Shtooka packages.

Each package (hsk-level-N-audio.zip) carries levelN-manifest.json plus checksum-named
MP3s; --level N selects the manifest, pinned handoff and committed upload map. This script reuses the Level 2 importer's exact-reading rules and source checks:
the manifest must re-derive from the preserved Shtooka index for the pinned level
handoff, every MP3 must match its Git blob, byte count and SHA-256, and only
"matched" rows (one exact headword+reading candidate) can receive audio. Missing and
reading-mismatch rows stay empty; no tone, neutral tone or syllable is ever borrowed.

  --level N        3 or 4 (default 3)
  --cache DIR      extracted package "recordings/" directory (outside the repository)
  --upload         upload pending clips once each with lovable-assets (resumable)
  --uploads PATH   pointer JSONs written by --upload, named <gitBlob>.json, or the
                   committed importer/data/hsk-audio/levelN-uploads.json map (gitBlob -> pointer)
  --write          attach to src/data/vocabulary/ (audio + updatedAt only)
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location('hsk2_audio', Path(__file__).with_name('import-hsk-level2-audio.py'))
base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(base)

ROOT = base.ROOT
INPUT = base.INPUT
VOCABULARY = base.VOCABULARY
# Per-level inputs: manifest and upload map live beside the shared Shtooka index.
LEVELS = {3: ('hsk3_level3_1.0.4.json', 500), 4: ('hsk3_level4_1.0.3.json', 1000)}
LEVEL = SIZE = MANIFEST = HANDOFF = UPLOAD_MAP = None


def configure(level):
    global LEVEL, SIZE, MANIFEST, HANDOFF, UPLOAD_MAP
    handoff, SIZE = LEVELS[level]
    LEVEL = level
    MANIFEST = INPUT / f'level{level}-manifest.json'
    HANDOFF = ROOT / 'importer/hsk' / handoff
    UPLOAD_MAP = INPUT / f'level{level}-uploads.json'


configure(3)
read, sha256, reading = base.read, base.sha256, base.reading


def git_blob(data):
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def load_manifest():
    manifest = read(MANIFEST)
    source = manifest['source']
    index_raw = (INPUT / 'cmn-caen-tan-index.xml.bz2').read_bytes()
    index = base.source_index(index_raw)  # also enforces the pinned index checksum/attribution
    if manifest['level'] != LEVEL or source['commit'] != base.COMMIT or source['name'] != base.SOURCE \
            or source['license'] != base.LICENSE or source['metadataSha256'] != sha256(index_raw):
        raise ValueError('Manifest source differs from the pinned Shtooka inputs')
    if manifest['handoff']['sha256'] != sha256(HANDOFF.read_bytes()):
        raise ValueError(f'Manifest is bound to a different Level {LEVEL} handoff')
    if source['noticeSha256'] != sha256((INPUT / 'cmn-caen-tan-readme.txt').read_bytes()):
        raise ValueError('Source notice checksum mismatch')
    for row in manifest['entries']:
        expected = base.match({'id': row['entryId'], 'hsk_index': row['hskIndex'], 'simplified': row['headword'],
                               'pinyinDisplay': row['reading']}, index)
        if row['sourceCandidates'] != expected['sourceCandidates'] or row['status'] != expected['status']:
            raise ValueError(f"Manifest does not match the preserved source metadata: {row['hskIndex']}")
        if row['status'] == 'matched' and row['recording']['path'] != f"64k/hsk/cmn-{row['headword']}.mp3":
            raise ValueError(f"Unexpected recording path: {row['hskIndex']}")
    return manifest


def pointer_for(uploads, blob):
    # Upload pointers are either the resumable per-clip directory or the committed map,
    # which keeps the completed CDN uploads durable so --write can be rerun anywhere.
    if not uploads:
        return None
    if uploads.is_file():
        return read(uploads).get(blob)
    path = uploads / (blob + '.json')
    return read(path) if path.exists() else None


def import_audio(vocabulary, manifest, uploads=None):
    by_id = {entry['id']: entry for entry in vocabulary['entries'] if entry['hskLevel'] == LEVEL}
    if len(by_id) != SIZE or len(manifest['entries']) != SIZE or {row['entryId'] for row in manifest['entries']} != set(by_id):
        raise ValueError(f'Level {LEVEL} record identities are incomplete')
    result = json.loads(json.dumps(vocabulary))
    targets = {entry['id']: entry for entry in result['entries']}
    report = {'matched': 0, 'missing': 0, 'reading_mismatch': 0, 'ambiguous': 0, 'missing_audio_file': 0,
              'attached': 0, 'reusedExisting': 0, 'pendingUpload': [], 'changed': 0}
    for row in manifest['entries']:
        entry = by_id[row['entryId']]
        if (entry['hsk_index'], entry['simplified'], entry['pinyinDisplay']) != (row['hskIndex'], row['headword'], row['reading']):
            raise ValueError(f"Changed Level {LEVEL} identity/reading: {row['hskIndex']}")
        report[row['status']] += 1
        if row['status'] != 'matched':
            continue
        exact = [item for item in row['sourceCandidates'] if reading(item['reading']) == reading(row['reading'])]
        if len(exact) != 1:
            raise ValueError('Matched recording does not have one exact source reading')
        # Reuse an attached whole-word clip (another level or this entry itself) only for
        # this exact written form and reading from the same source — never another tone.
        reusable = next((item['audio'] for item in vocabulary['entries'] if item.get('audio')
                         and item['simplified'] == row['headword'] and reading(item['pinyinDisplay']) == reading(row['reading'])
                         and item['audio'].get('source') == base.SOURCE and item['audio'].get('recordingKind') == 'word'), None)
        pointer = pointer_for(uploads, row['recording']['gitBlob'])
        if reusable:
            attachment = reusable
            report['reusedExisting'] += 1
        elif pointer:
            attachment = base.uploaded_audio(pointer, row['recording'])
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


def verified_clip(cache, recording):
    path = cache / Path(recording['archivePath']).name
    data = path.read_bytes()
    if len(data) != recording['bytes'] or sha256(data) != recording['sha256'] or git_blob(data) != recording['gitBlob']:
        raise ValueError(f'Package audio checksum mismatch: {path.name}')
    return path


def upload(manifest, cache, uploads):
    executable = shutil.which('lovable-assets')
    if not executable:
        raise ValueError('lovable-assets is unavailable; no uploads attempted')
    uploads.mkdir(parents=True, exist_ok=True)
    _, coverage = import_audio(base.vocabulary_store.read_vocabulary(VOCABULARY), manifest, uploads)
    pending = set(coverage['pendingUpload'])
    recordings = {row['recording']['gitBlob']: row['recording'] for row in manifest['entries'] if row['hskIndex'] in pending}

    def one(recording):
        # Each clip is uploaded at most once: an existing pointer means it is done.
        pointer_path = uploads / (recording['gitBlob'] + '.json')
        if pointer_path.exists():
            base.uploaded_audio(read(pointer_path), recording)
            return
        path = verified_clip(cache, recording)
        completed = subprocess.run([executable, 'create', '--file', str(path), '--filename', f"hsk{LEVEL}-{recording['sha256'][:16]}.mp3"],
                                   check=True, capture_output=True, text=True)
        pointer = json.loads(completed.stdout)
        base.uploaded_audio(pointer, recording)
        pointer_path.write_text(json.dumps(pointer, indent=2) + '\n', 'utf-8')

    # Distinct clips upload in parallel; one process owns the uploads directory.
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for count, _ in enumerate(pool.map(one, recordings.values()), 1):
            if count % 25 == 0 or count == len(recordings):
                print(f'uploaded {count}/{len(recordings)}', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--level', type=int, choices=sorted(LEVELS), default=3)
    parser.add_argument('--cache', type=Path)
    parser.add_argument('--verify-cache', action='store_true')
    parser.add_argument('--upload', action='store_true')
    parser.add_argument('--uploads', type=Path)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if (args.upload or args.verify_cache) and (not args.cache or ROOT == args.cache.resolve() or ROOT in args.cache.resolve().parents):
        parser.error('--cache must be the extracted package recordings/ directory outside the repository')
    if args.upload and (not args.uploads or args.uploads.is_file()):
        parser.error('--upload requires an --uploads directory')
    configure(args.level)
    manifest = load_manifest()
    if args.verify_cache:
        clips = {row['recording']['gitBlob']: row['recording'] for row in manifest['entries'] if row['status'] == 'matched'}
        for recording in clips.values():
            verified_clip(args.cache, recording)
        print(f'Verified {len(clips)} package MP3s')
    if args.upload:
        upload(manifest, args.cache, args.uploads)
    data, report = import_audio(base.vocabulary_store.read_vocabulary(VOCABULARY), manifest, args.uploads)
    if args.write:
        base.vocabulary_store.write_vocabulary(data, VOCABULARY)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'mode': 'written' if args.write else 'audit-only', **report}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
