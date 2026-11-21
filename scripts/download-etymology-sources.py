"""Stage pinned etymology sources without changing browser data or catalogue records.

Run with --download to acquire the explicitly selected sources, --check for an
offline integrity/format audit, or --refresh-metadata to regenerate the manifest's
license metadata from verified local notices. Upstream code is never executed
and ZIP members are read in memory rather than extracted to the filesystem.
"""
import argparse
import datetime
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'importer/data/etymology'
DATASET_VERSION = '1.0.0'
HOWELL_REPO = 'conscientiousCode/Etymological-Dictionary-of-Han-Chinese-Characters-Database'
HOWELL_REV = '377b75896d5fbe454c6dd3d643311c16f0395469'
SHUOWEN_REPO = 'shuowenjiezi/shuowen'
SHUOWEN_REV = '6553a350763ce4feca2c5d1cc2cad7e594dc2975'
SHUOWEN_ARCHIVE_SHA256 = '737ecb6f1a7de474bc0b8ff4cd95b9064441090d6360f6ad9632881edb63426d'
SHUOWEN_DOCUMENTS = [
    ('LICENSE', 'LICENSE', '261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64'),
    ('README.md', 'upstream-README.md', 'e90c290b5903eddfbc9949e7f9ffa0a49ea8d72b'),
    ('doc/FORMAT.md', 'upstream-FORMAT.md', '7d9bdf676d1fb101a5dc4857fbb22c73439b3cae'),
]
HOWELL_FILES = {
    'README.md': ('upstream-README.md', 'b1f03bb7e50f32968fa5ecc28e1faa9fa69d9e2f'),
    'LICENSE': ('upstream-LICENSE', '079d88d34129d4ce9e42b98a9b96295ca8867677'),
    'LICENSES/LICENSE - Etymological Dictionary Parser and Output.txt':
        ('LICENSE - Etymological Dictionary Parser and Output.txt', 'cc6a5c17d61c3657b293a6b5d2f53901a53867c2'),
    'LICENSES/LICENSE - Etymological Dictionary of Han Chinese Characters.txt':
        ('LICENSE - Etymological Dictionary of Han Chinese Characters.txt', '6849880d03cf9db790132eb738903c7d93e17604'),
    'data/howell_etymology_text_database.txt':
        ('howell_etymology_text_database.txt', '949930970efd7ff97143282f3dabadb784ab1b42'),
    'data/howell_etymology.txt': ('howell_etymology.txt', 'd37043a6f1e1c0acb927cc730d65251a7dc10478'),
    'data/EtymologicalDictionaryOfHanChineseCharacters-HowellAndMorimoto.pdf':
        ('EtymologicalDictionaryOfHanChineseCharacters-HowellAndMorimoto.pdf', '02163fc4ef694737557365133d20e08af7b0f0c2'),
}


def git_blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mandarin-Mastery-source-import/1'})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(30_000_001)
    if not raw or len(raw) > 30_000_000:
        raise ValueError(f'Empty or oversized source: {url}')
    return raw


def file_record(path, raw, upstream_path, url, expected_blob=None):
    if expected_blob and git_blob(raw) != expected_blob:
        raise ValueError(f'Upstream Git blob mismatch: {upstream_path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() != raw:
        raise ValueError(f'Refusing to overwrite changed source: {path}')
    path.write_bytes(raw)
    return {'path': path.relative_to(DEST).as_posix(), 'upstreamPath': upstream_path,
            'url': url, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'gitBlobSha1': expected_blob}


def howell_inventory(raw):
    # Inspect labelled fields only; do not run the upstream Python parser or
    # reinterpret Japanese readings/shinjitai as Mandarin catalogue metadata.
    text = raw.decode('utf-8-sig')
    labels = ['kanji', 'kanji_stroke_count', 'shinjitai', 'shinjitai_stroke_count',
              'onyomi', 'kunyomi', 'raw_etymology', 'tags']
    headwords = []
    for block in re.split(r'(?m)^___\r?$', text):
        lines = block.strip('\r\n').splitlines()
        if not lines:
            continue
        if [line.partition(':')[0] for line in lines] != labels:
            raise ValueError('Unrecognized Howell labelled-entry format')
        headwords.append(lines[0].partition(':')[2])
    if not headwords:
        raise ValueError('No Howell entries found')
    return {'recordCount': len(headwords), 'distinctHeadwordCount': len(set(headwords)),
            'format': 'upstream labelled UTF-8 text; Japanese readings retained only in source'}


def shuowen_inventory(raw):
    if hashlib.sha256(raw).hexdigest() != SHUOWEN_ARCHIVE_SHA256:
        raise ValueError('Pinned Shuowen archive checksum mismatch')
    heads = []
    ids = set()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        members = [name for name in archive.namelist() if re.fullmatch(r'[^/]+/data/[0-9]+\.json', name)]
        if not members:
            raise ValueError('No Shuowen JSON records in pinned archive')
        for name in members:
            data = json.loads(archive.read(name))
            if str(data['id']) != Path(name).stem or data['id'] in ids:
                raise ValueError(f'Shuowen source identity mismatch: {name}')
            if not isinstance(data['wordhead'], str) or not isinstance(data['explanation'], str):
                raise ValueError(f'Invalid Shuowen entry: {name}')
            ids.add(data['id'])
            heads.append(data['wordhead'])
    return {'recordCount': len(heads), 'distinctHeadwordCount': len(set(heads)),
            'format': 'original data/<id>.json members inside the unmodified upstream ZIP'}


def dataset_metadata(manifest):
    """Carry source-specific notices inside the distributable manifest itself.

    Read exact UTF-8 notice bytes, including original line endings, rather than
    reducing licenses to identifiers. The collection has two independent licenses;
    its version describes our packaging, while source revisions remain upstream IDs.
    """
    notices = []
    paths = {
        'howell': ['howell/LICENSE - Etymological Dictionary of Han Chinese Characters.txt',
                   'howell/LICENSE - Etymological Dictionary Parser and Output.txt'],
        'shuowen': ['shuowen/LICENSE'],
    }
    for source in manifest['sources']:
        files = {record['path']: record for record in source['files']}
        for path in paths[source['id']]:
            record = files[path]
            notice = (DEST / path).read_bytes().decode('utf-8')
            copyright_path = 'shuowen/upstream-README.md' if source['id'] == 'shuowen' else path
            copyright_text = (DEST / copyright_path).read_bytes().decode('utf-8')
            copyright_notice = next(line for line in copyright_text.splitlines()
                                    if line.startswith('Copyright'))
            notices.append({'source_id': source['id'], 'license': source['license'],
                'source_path': path, 'source_url': record['url'], 'sha256': record['sha256'],
                'copyright_source_path': copyright_path, 'copyright_notice': copyright_notice,
                'notice': notice})
    # This is the actual acquisition date recorded in the manifest, never the
    # current regeneration date or an example date supplied in documentation.
    import_date = datetime.datetime.fromisoformat(manifest['retrievedAt']).date().isoformat()
    return {'source_name': 'Mandarin etymology source collection',
        'source_urls': [source['repository'] for source in manifest['sources']],
        'license': 'source-specific',
        'license_scope': 'Howell material is MIT; Shuowen material is Apache-2.0. Notices apply to their respective sources, not as a blanket relicensing of the collection.',
        'import_date': import_date, 'version': DATASET_VERSION,
        'disclaimer': 'Historical explanations and author interpretations provided for educational context; unreviewed source material, not verified modern etymology, Mandarin pronunciation or stroke geometry.',
        'license_notices': notices}


def write_manifest(manifest):
    manifest['dataset_metadata'] = dataset_metadata(manifest)
    # Keep metadata before the source inventory for human readers and future
    # export adapters, without changing any downloaded file or its checksum.
    ordered = {key: manifest[key] for key in
               ('$schema', 'format', 'schemaVersion', 'dataset_metadata', 'retrievedAt', 'sources')}
    (DEST / 'manifest.json').write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def refresh_metadata():
    # Audit originals first. Existing metadata may be absent or stale, but a
    # changed license file or source inventory must still fail before writing.
    check(verify_metadata=False)
    manifest = json.loads((DEST / 'manifest.json').read_text(encoding='utf-8'))
    write_manifest(manifest)
    check()


def acquire():
    manifest_path = DEST / 'manifest.json'
    if manifest_path.exists():
        check()
        print('Pinned sources already present; no downloads needed.')
        return
    sources = []
    files = []
    for upstream, (local, blob) in HOWELL_FILES.items():
        url = f'https://raw.githubusercontent.com/{HOWELL_REPO}/{HOWELL_REV}/{urllib.parse.quote(upstream)}'
        path = DEST / 'howell' / local
        raw = path.read_bytes() if path.exists() else download(url)
        files.append(file_record(path, raw, upstream, url, blob))
        print(f'Verified {local}: {len(raw)} bytes', flush=True)
    sources.append({'id': 'howell', 'title': 'Etymological Dictionary of Han/Chinese Characters',
        'authors': ['Lawrence J. Howell', 'Hikaru Morimoto (research collaborator)', 'Daniel B. Herman (parser and output)'],
        'repository': f'https://github.com/{HOWELL_REPO}', 'revision': HOWELL_REV,
        'license': 'MIT', 'reviewStatus': 'unreviewed-source-material',
        'scopeNote': 'Author interpretations; Japanese readings and shinjitai are not Mandarin readings or simplified-form mappings. Retain both MIT notices.',
        'inventory': howell_inventory((DEST / 'howell/howell_etymology_text_database.txt').read_bytes()),
        'files': files})

    url = f'https://codeload.github.com/{SHUOWEN_REPO}/zip/{SHUOWEN_REV}'
    archive_path = DEST / 'shuowen' / 'upstream.zip'
    raw = archive_path.read_bytes() if archive_path.exists() else download(url)
    inventory = shuowen_inventory(raw)
    files = [file_record(archive_path, raw, '/', url)]
    # Keep license, source description and format specification readable without
    # unpacking thousands of original records. Copies retain their exact bytes.
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        prefix = f'shuowen-{SHUOWEN_REV}/'
        for upstream, local, blob in SHUOWEN_DOCUMENTS:
            content = archive.read(prefix + upstream)
            files.append(file_record(DEST / 'shuowen' / local, content, upstream,
                f'https://raw.githubusercontent.com/{SHUOWEN_REPO}/{SHUOWEN_REV}/{upstream}', blob))
    print(f'Verified Shuowen archive: {inventory["recordCount"]} JSON records', flush=True)
    sources.append({'id': 'shuowen', 'title': 'Shuowen.org source records',
        'authors': ['Shuowen.org contributors'], 'repository': f'https://github.com/{SHUOWEN_REPO}',
        'revision': SHUOWEN_REV, 'license': 'Apache-2.0',
        'reviewStatus': 'unreviewed-source-material',
        'scopeNote': 'Historical dictionary explanations and commentary, not automatically modern scholarly conclusions. Indexes, components and seal-font encodings must not resolve catalogue identities or handwriting geometry.',
        'inventory': inventory, 'files': files})
    manifest = {'$schema': './manifest.schema.json', 'format': 'mandarin-etymology-source-manifest',
        'schemaVersion': 1, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'sources': sources}
    write_manifest(manifest)
    check()


def check(verify_metadata=True):
    manifest = json.loads((DEST / 'manifest.json').read_text(encoding='utf-8'))
    if manifest['format'] != 'mandarin-etymology-source-manifest' or manifest['schemaVersion'] != 1:
        raise ValueError('Unsupported manifest version')
    if [(s['id'], s['revision']) for s in manifest['sources']] != [('howell', HOWELL_REV), ('shuowen', SHUOWEN_REV)]:
        raise ValueError('Unexpected source revision or source order')
    seen = set()
    for source in manifest['sources']:
        expected = ({f'howell/{local}': (upstream, blob)
                     for upstream, (local, blob) in HOWELL_FILES.items()}
                    if source['id'] == 'howell' else
                    {'shuowen/upstream.zip': ('/', None),
                     **{f'shuowen/{local}': (upstream, blob)
                        for upstream, local, blob in SHUOWEN_DOCUMENTS}})
        actual = {item['path']: (item['upstreamPath'], item['gitBlobSha1'])
                  for item in source['files']}
        if actual != expected or len(actual) != len(source['files']):
            raise ValueError(f'Source file inventory mismatch: {source["id"]}')
        for record in source['files']:
            path = (DEST / record['path']).resolve()
            if not path.is_relative_to(DEST.resolve()) or record['path'] in seen:
                raise ValueError('Unsafe or duplicate source path')
            seen.add(record['path'])
            raw = path.read_bytes()
            if len(raw) != record['bytes'] or hashlib.sha256(raw).hexdigest() != record['sha256']:
                raise ValueError(f'Source checksum mismatch: {record["path"]}')
            if record['gitBlobSha1'] and git_blob(raw) != record['gitBlobSha1']:
                raise ValueError(f'Source Git blob mismatch: {record["path"]}')
        raw = (DEST / ('howell/howell_etymology_text_database.txt' if source['id'] == 'howell' else 'shuowen/upstream.zip')).read_bytes()
        inventory = howell_inventory(raw) if source['id'] == 'howell' else shuowen_inventory(raw)
        if inventory != source['inventory']:
            raise ValueError(f'Source inventory mismatch: {source["id"]}')
        print(f'{source["id"]}: {inventory["recordCount"]} records; hashes and inventory verified', flush=True)
    if verify_metadata and manifest.get('dataset_metadata') != dataset_metadata(manifest):
        raise ValueError('Missing or stale dataset metadata/notices; run --refresh-metadata after verifying the source files')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--download', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--refresh-metadata', action='store_true')
    args = parser.parse_args()
    if args.download:
        acquire()
    elif args.refresh_metadata:
        refresh_metadata()
    else:
        check()
