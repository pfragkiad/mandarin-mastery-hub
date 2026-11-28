#!/usr/bin/env python3
"""Download exact recorded HSK words and build a verified CDN-upload ZIP outside the repo.

Reuses the audio importer's pinned source, reading rules and identity validation. Only
metadata/coverage reports enter the repository; MP3s and ZIPs remain external artifacts.
"""
import argparse
from collections import Counter
import concurrent.futures
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time
import urllib.parse
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('hsk_audio', Path(__file__).with_name('import-hsk-word-audio.py'))
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


def external(path):
    path = path.resolve()
    if path == audio.ROOT or audio.ROOT in path.parents:
        raise ValueError('Audio cache and ZIP must stay outside the repository')
    return path


def fetch(url):
    # A transient download failure must never become a missing lexical match.
    for attempt in range(3):
        try:
            return audio.base.fetch(url)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def handoff_entry_id(hsk_id, level):
    # Matches the deterministic UUIDv5 namespace used by scripts/import-hsk-level1.mjs.
    namespace = bytes.fromhex('6ba7b8119dad11d180b400c04fd430c8')
    digest = bytearray(hashlib.sha1(namespace + f'mandarin-tutor:hsk3-level{level}:entry:{hsk_id}'.encode()).digest()[:16])
    digest[6] = (digest[6] & 0x0f) | 0x50
    digest[8] = (digest[8] & 0x3f) | 0x80
    hex_str = digest.hex()
    return f'{hex_str[:8]}-{hex_str[8:12]}-{hex_str[12:16]}-{hex_str[16:20]}-{hex_str[20:]}'


def prepare(cache, output):
    cache, output = external(cache), external(output)
    index_raw = (audio.INPUT / 'cmn-caen-tan-index.xml.bz2').read_bytes()
    notice = (audio.INPUT / 'cmn-caen-tan-readme.txt').read_bytes()
    index = audio.base.source_index(index_raw)
    if audio.sha256(notice) != '11584998323723287f6922af24006a794efcb02d0fc1ded75e9c6589e18ff95b':
        raise ValueError('Source notice checksum mismatch')
    handoff = audio.read(audio.HANDOFF)
    vocabulary = audio.base.vocabulary_store.read_vocabulary(audio.VOCABULARY)
    entries = [entry for entry in vocabulary['entries'] if entry['hskLevel'] == audio.LEVEL]
    if entries:
        if len(entries) != audio.SIZE or {(e['hsk_index'], e['simplified'], e['pinyinDisplay']) for e in entries} != {
                (e['id'], e['headword'], e['pinyin']) for e in handoff['entries']}:
            raise ValueError('Import the exact level handoff before preparing its audio')
    elif audio.LEVEL == 6 and len(handoff['entries']) == audio.SIZE:
        entries = [{'id': handoff_entry_id(e.get('legacy_syllabus_id', e['id']), audio.LEVEL), 'hsk_index': e['id'],
                    'simplified': e['headword'], 'pinyinDisplay': e['pinyin']}
                   for e in handoff['entries']]
    else:
        raise ValueError('Import the exact level handoff before preparing its audio')
    tree = json.loads(fetch(f'https://api.github.com/repos/hugolpz/audio-cmn/git/trees/{audio.base.COMMIT}?recursive=1'))
    if tree.get('truncated') or 'tree' not in tree:
        raise ValueError('Incomplete pinned audio-cmn tree')
    files = {item['path']: item for item in tree['tree'] if item['type'] == 'blob'}
    rows = [audio.base.match(entry, index) for entry in entries]
    for row in rows:
        if row['status'] != 'matched':
            continue
        path = f"64k/hsk/cmn-{row['headword']}.mp3"
        if path not in files:
            row['status'] = 'missing_audio_file'
            continue
        row['recording'] = {'path': path, 'gitBlob': files[path]['sha'], 'bytes': files[path]['size'],
                            'archivePath': f"recordings/{files[path]['sha']}.mp3"}
    unique = {row['recording']['gitBlob']: row['recording'] for row in rows if row['status'] == 'matched'}
    cache.mkdir(parents=True, exist_ok=True)

    def download(recording):
        path = cache / (recording['gitBlob'] + '.mp3')
        url = f'https://raw.githubusercontent.com/hugolpz/audio-cmn/{audio.base.COMMIT}/' + urllib.parse.quote(recording['path'])
        data = path.read_bytes() if path.exists() else fetch(url)
        if len(data) != recording['bytes'] or audio.git_blob(data) != recording['gitBlob']:
            raise ValueError(f"Pinned recording checksum mismatch: {recording['path']}")
        path.write_bytes(data)
        return recording['gitBlob'], audio.sha256(data)

    checksums = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for count, (blob, checksum) in enumerate(pool.map(download, unique.values()), 1):
            checksums[blob] = checksum
            if count % 100 == 0 or count == len(unique):
                print(f'Verified {count}/{len(unique)} unique recordings', flush=True)
    for row in rows:
        if row['status'] == 'matched':
            row['recording']['sha256'] = checksums[row['recording']['gitBlob']]
    counts = dict(Counter(row['status'] for row in rows))
    manifest = {'version': 1, 'level': audio.LEVEL,
                'handoff': {'file': audio.HANDOFF.name, 'sha256': audio.sha256(audio.HANDOFF.read_bytes())},
                'source': {'name': audio.base.SOURCE, 'speaker': 'Yue Tan', 'license': audio.base.LICENSE,
                           'licenseUrl': 'https://creativecommons.org/licenses/by-sa/3.0/us/',
                           'repository': 'https://github.com/hugolpz/audio-cmn', 'commit': audio.base.COMMIT,
                           'quality': '64k/hsk', 'metadataUrl': audio.base.BASE + 'mp3/index.xml',
                           'metadataSha256': audio.sha256(index_raw), 'noticeUrl': audio.base.BASE + 'readme.txt',
                           'noticeSha256': audio.sha256(notice)},
                'counts': counts, 'matching': 'Exact headword and reading; only case, whitespace and apostrophes ignored.',
                'notes': 'Recorded text/reading identity and bytes checked; no independent listening certification. Word audio only.',
                'entries': rows}
    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    audio.MANIFEST.write_text(manifest_text, 'utf-8')
    audio.load_manifest()
    for recording in unique.values():
        audio.verified_clip(cache, recording)
    readme = f'''# HSK Level {audio.LEVEL} word recordings

{len(entries)} exact vocabulary records; {counts.get('matched', 0)} matched entries;
{len(unique)} unique MP3s. Coverage by status: {json.dumps(counts)}.

Recordings: (c) 2009 Yue Tan / Shtooka cmn-caen-tan, CC BY-SA 3.0 US.
License: https://creativecommons.org/licenses/by-sa/3.0/us/
Source: https://github.com/hugolpz/audio-cmn/tree/{audio.base.COMMIT}/64k/hsk

The manifest binds every clip to an exact vocabulary UUID, HSK ID, headword and reading.
No sentence audio, generated speech or substituted pronunciations are included.
Upload each recordings/<gitBlob>.mp3 once to the Lovable CDN. Keep the returned
pointer JSONs keyed by gitBlob; do not create vocabulary URLs from filenames.

From the repository root, after extracting this ZIP outside the repository:
python scripts/import-hsk-word-audio.py --level {audio.LEVEL} --cache <extracted>/recordings --verify-cache
python scripts/import-hsk-word-audio.py --level {audio.LEVEL} --cache <extracted>/recordings --upload --uploads <external-uploads-dir>
python scripts/import-hsk-word-audio.py --level {audio.LEVEL} --uploads <external-uploads-dir> --write --report reports/hsk-level{audio.LEVEL}-audio.json

Reproduce with:
python scripts/prepare-hsk-word-audio.py --level {audio.LEVEL} --cache <external-cache> --output <external-output.zip>
'''
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr(f'level{audio.LEVEL}-manifest.json', manifest_text)
        package.writestr('README.md', readme)
        package.writestr('cmn-caen-tan-index.xml.bz2', index_raw)
        package.writestr('cmn-caen-tan-readme.txt', notice)
        package.write(audio.HANDOFF, 'source/' + audio.HANDOFF.name)
        for recording in unique.values():
            package.write(cache / (recording['gitBlob'] + '.mp3'), recording['archivePath'])
    # Reopen the deliverable and hash the actual archived MP3 bytes, not just the cache.
    with zipfile.ZipFile(output) as package:
        if package.testzip() is not None:
            raise ValueError('ZIP CRC validation failed')
        for recording in unique.values():
            data = package.read(recording['archivePath'])
            if audio.sha256(data) != recording['sha256'] or audio.git_blob(data) != recording['gitBlob']:
                raise ValueError('Archived MP3 checksum mismatch')
    report = {'level': audio.LEVEL, 'handoff': manifest['handoff'], 'source': manifest['source'],
              'entries': len(entries), 'counts': counts, 'uniqueClips': len(unique),
              'package': {'file': output.name, 'bytes': output.stat().st_size, 'sha256': audio.sha256(output.read_bytes())},
              'state': f'Verified ZIP prepared for owner CDN upload; no Level {audio.LEVEL} audio attached.',
              'exclusions': [row for row in rows if row['status'] != 'matched']}
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--level', type=int, choices=sorted(audio.LEVELS), required=True)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    audio.configure(args.level)
    report = prepare(args.cache, args.output)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'exclusions'}, indent=2))


if __name__ == '__main__':
    main()
