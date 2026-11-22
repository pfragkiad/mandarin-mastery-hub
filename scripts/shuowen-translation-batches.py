"""Prepare checksum-bound source batches and save independently authored English drafts.

No translation engine or paid service is called. Translation workers supply the
English text; this helper only preserves identities, notices and completeness.
"""
import argparse
import copy
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'importer/data/etymology/translations'
SOURCE_MANIFEST = ROOT / 'importer/data/etymology/manifest.json'
BATCH_SIZE = 100


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def prepare():
    manifest = json.loads(SOURCE_MANIFEST.read_text(encoding='utf-8'))
    source = next(item for item in manifest['sources'] if item['id'] == 'shuowen')
    archive = next(item for item in source['files'] if item['path'].endswith('/upstream.zip'))
    archive_path = SOURCE_MANIFEST.parent / archive['path']
    if sha(archive_path.read_bytes()) != archive['sha256']:
        raise ValueError('Shuowen source archive checksum mismatch')
    records = []
    with zipfile.ZipFile(archive_path) as zipped:
        for member in sorted((name for name in zipped.namelist() if re.fullmatch(r'[^/]+/data/[0-9]+\.json', name)),
                             key=lambda name: int(Path(name).stem)):
            entry = json.loads(zipped.read(member))
            records.append({'id': f'shuowen:{entry["id"]}', 'headword': entry['wordhead'],
                            'text': entry['explanation'], 'sourceTextSha256': sha(entry['explanation'].encode('utf-8'))})
    metadata = {'source_name': 'Shuowen Jiezi English translation drafts', 'source_url': source['repository'],
                'source_revision': source['revision'], 'source_archive_sha256': archive['sha256'],
                'license': 'Apache-2.0', 'license_notices': [notice for notice in manifest['dataset_metadata']['license_notices'] if notice['source_id'] == 'shuowen'],
                'version': '1.0.0', 'import_date': manifest['dataset_metadata']['import_date'],
                'disclaimer': 'New AI-generated English drafts of the recorded Classical Chinese; not scholarly reviewed. Original source interpretations are not verified geometry or modern etymology.'}
    directory = BASE / 'source-batches'
    directory.mkdir(parents=True, exist_ok=True)
    for offset in range(0, len(records), BATCH_SIZE):
        name = f'{offset // BATCH_SIZE + 1:03d}'
        payload = {'format': 'mandarin-shuowen-translation-source-batch', 'schemaVersion': 1,
                   'dataset_metadata': metadata, 'batch': name, 'records': records[offset:offset + BATCH_SIZE]}
        (directory / f'{name}.json').write_bytes(encode(payload))
    print(f'Prepared {len(records)} source records in {(len(records) + BATCH_SIZE - 1) // BATCH_SIZE} batches.')


def save_batch(batch, translations, uncertain_ids=()):
    """Save a complete authored batch; no placeholder or inherited translation accepted."""
    name = f'{int(batch):03d}'
    source_path = BASE / 'source-batches' / f'{name}.json'
    raw = source_path.read_bytes()
    source = json.loads(raw)
    records = {record['id']: record for record in source['records']}
    if set(translations) != set(records):
        raise ValueError(f'Incomplete batch {name}: missing {sorted(set(records) - set(translations))}; extra {sorted(set(translations) - set(records))}')
    if not set(uncertain_ids) <= set(records):
        raise ValueError('Unknown uncertainty ID')
    for key, text in translations.items():
        if not isinstance(text, str) or not text.strip() or text.strip().lower() in ('todo', 'pending', 'translation pending'):
            raise ValueError(f'Missing English draft: {key}')
        if text == records[key]['text']:
            raise ValueError(f'Untranslated source copied as English: {key}')
        if re.search(r'(?<!\w)\?|\?(?=\w)', text) or '\ufffd' in text:
            raise ValueError(f'Possible encoding loss in {key}; preserve Unicode glyphs and express uncertainty in words')
    metadata = copy.deepcopy(source['dataset_metadata'])
    metadata.update({'language': 'en', 'method': 'ai-generated', 'review_status': 'unreviewed-ai-draft',
                     'source_batch_sha256': sha(raw), 'created_date': date.today().isoformat()})
    payload = {'format': 'mandarin-shuowen-english-draft-batch', 'schemaVersion': 1,
               'dataset_metadata': metadata, 'batch': name,
               'translations': {key: {'text': translations[key], 'sourceTextSha256': record['sourceTextSha256'],
                                      'uncertain': key in uncertain_ids} for key, record in records.items()}}
    directory = BASE / 'en'
    directory.mkdir(parents=True, exist_ok=True)
    # Readers see a complete envelope even while another worker is saving.
    output = directory / f'{name}.json'
    temporary = output.with_suffix('.json.tmp')
    temporary.write_bytes(encode(payload))
    temporary.replace(output)
    print(f'Saved batch {name}: {len(records)} English drafts.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true', required=True)
    parser.parse_args()
    prepare()
