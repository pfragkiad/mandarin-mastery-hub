"""Generate complementary, lazy etymology JSON using exact application identities.

python scripts/import-etymology.py --write
python scripts/import-etymology.py --check

Original source bytes and all catalogue/IDS/geometry files are read-only. The Node
bridge owns library and radical-form identity construction and BabelStone parsing.
Python preserves source text/locators and makes deterministic JSON shards/reports.
Separately authored English drafts must cover every original Shuowen ID and bind
to its unchanged Chinese text; they remain explicitly AI-generated/unreviewed.
"""
import argparse
from collections import Counter, defaultdict
from contextlib import redirect_stdout
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'importer/data/etymology'
OUTPUT = ROOT / 'public/data/etymology'
REPORT = ROOT / 'reports/etymology-association-audit.json'


def serialized(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def load_downloader():
    spec = importlib.util.spec_from_file_location('etymology_sources', ROOT / 'scripts/download-etymology-sources.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_entries(manifest):
    """Return every original headword entry, without script/meaning normalization."""
    by_glyph = defaultdict(list)
    sources = {source['id']: source for source in manifest['sources']}
    howell = sources['howell']
    file = next(item for item in howell['files'] if item['path'].endswith('/howell_etymology_text_database.txt'))
    lines = (SOURCES / file['path']).read_bytes().decode('utf-8-sig').splitlines()
    block = []
    start = 1
    ordinal = 0
    for number, line in enumerate(lines + ['___'], 1):
        if line != '___':
            if not block:
                start = number
            block.append(line)
            continue
        if not block:
            continue
        ordinal += 1
        fields = dict(item.split(':', 1) for item in block)
        glyph = fields['kanji']
        if len(glyph) != 1:
            raise ValueError('Howell headword is not one recorded code point')
        by_glyph[glyph].append({'id': f'howell:{ord(glyph):x}', 'sourceId': 'howell', 'headword': glyph,
            'contentKind': 'author-interpretation', 'language': 'en', 'text': fields['raw_etymology'],
            'reviewStatus': 'unreviewed-source-material',
            'sourceRecord': {'file': file['path'], 'sha256': file['sha256'], 'revision': howell['revision'],
                             'locator': {'entryOrdinal': ordinal, 'startLine': start, 'endLine': number - 1}},
            'sourceUrl': f'{howell["repository"]}/blob/{howell["revision"]}/{file["upstreamPath"]}#L{start}-L{number - 1}'})
        block = []
    shuowen = sources['shuowen']
    archive = next(item for item in shuowen['files'] if item['path'].endswith('/upstream.zip'))
    with zipfile.ZipFile(SOURCES / archive['path']) as zipped:
        members = sorted((name for name in zipped.namelist() if re.fullmatch(r'[^/]+/data/[0-9]+\.json', name)),
                         key=lambda name: int(Path(name).stem))
        for name in members:
            raw = zipped.read(name)
            source = json.loads(raw)
            glyph = source['wordhead']
            if len(glyph) != 1:
                raise ValueError('Shuowen headword is not one recorded code point')
            by_glyph[glyph].append({'id': f'shuowen:{source["id"]}', 'sourceId': 'shuowen', 'headword': glyph,
                'contentKind': 'historical-dictionary', 'language': 'lzh', 'text': source['explanation'],
                'reviewStatus': 'unreviewed-source-material',
                'sourceRecord': {'file': archive['path'], 'sha256': archive['sha256'], 'revision': shuowen['revision'],
                                 'locator': {'member': name, 'memberSha256': digest(raw), 'entryId': source['id']}},
                'sourceUrl': f'{shuowen["repository"]}/blob/{shuowen["revision"]}/data/{source["id"]}.json'})
    ids = [entry['id'] for entries in by_glyph.values() for entry in entries]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate normalized source entry ID')
    counts = Counter(entry['sourceId'] for entries in by_glyph.values() for entry in entries)
    for source in manifest['sources']:
        if counts[source['id']] != source['inventory']['recordCount']:
            raise ValueError('Source entry count changed during extraction')
    return dict(by_glyph)


def shard_for(glyph):
    # Unicode blocks of 256 code points bound fetch size without thousands of
    # tiny files. The glyph is always looked up exactly inside the shard.
    return f'glyphs/{ord(glyph) >> 8:04x}.json'


def attach_shuowen_translations(entries, manifest):
    """Attach only complete, source-bound English drafts; keep Chinese text intact."""
    expected = {entry['id']: entry for notes in entries.values() for entry in notes if entry['sourceId'] == 'shuowen'}
    seen = set()
    inputs = {}
    uncertain = 0
    directory = SOURCES / 'translations'
    upstream = next(item for item in manifest['sources'] if item['id'] == 'shuowen')
    archive = next(item for item in upstream['files'] if item['path'].endswith('/upstream.zip'))
    provenance = {'source_url': upstream['repository'], 'source_revision': upstream['revision'],
                  'source_archive_sha256': archive['sha256'], 'license': 'Apache-2.0',
                  'license_notices': [notice for notice in manifest['dataset_metadata']['license_notices'] if notice['source_id'] == 'shuowen'],
                  'import_date': manifest['dataset_metadata']['import_date'], 'version': '1.0.0'}
    for path in sorted((directory / 'en').glob('*.json')):
        if not re.fullmatch(r'[0-9]{3}\.json', path.name):
            raise ValueError(f'Unexpected translation batch: {path.name}')
        source_path = directory / 'source-batches' / path.name
        source_raw = source_path.read_bytes()
        source = json.loads(source_raw)
        payload = json.loads(path.read_text(encoding='utf-8'))
        meta = payload['dataset_metadata']
        if source['format'] != 'mandarin-shuowen-translation-source-batch' or source['schemaVersion'] != 1 or source['batch'] != path.stem:
            raise ValueError(f'Invalid translation source envelope: {path.name}')
        if payload['format'] != 'mandarin-shuowen-english-draft-batch' or payload['schemaVersion'] != 1 or payload['batch'] != path.stem:
            raise ValueError(f'Invalid translation envelope: {path.name}')
        if any(meta.get(key) != value or source['dataset_metadata'].get(key) != value for key, value in provenance.items()):
            raise ValueError(f'Translation source provenance or license changed: {path.name}')
        if meta['source_batch_sha256'] != digest(source_raw) or meta['language'] != 'en' or meta['method'] != 'ai-generated' or meta['review_status'] != 'unreviewed-ai-draft':
            raise ValueError(f'Unbound or incorrectly labeled translation batch: {path.name}')
        source_records = {record['id']: record for record in source['records']}
        if len(source_records) != len(source['records']):
            raise ValueError(f'Duplicate translation source identity: {path.name}')
        if set(payload['translations']) != set(source_records):
            raise ValueError(f'Incomplete translation batch: {path.name}')
        for entry_id, draft in payload['translations'].items():
            if entry_id in seen or entry_id not in expected:
                raise ValueError(f'Duplicate or unknown translation identity: {entry_id}')
            seen.add(entry_id)
            entry = expected[entry_id]
            original = source_records[entry_id]
            source_hash = digest(entry['text'].encode('utf-8'))
            if original['headword'] != entry['headword'] or original['text'] != entry['text'] or original['sourceTextSha256'] != source_hash or draft['sourceTextSha256'] != source_hash:
                raise ValueError(f'Translation is bound to changed Chinese text: {entry_id}')
            text = draft['text']
            if not isinstance(text, str) or not text.strip() or not re.search('[A-Za-z]', text) or text == entry['text']:
                raise ValueError(f'Missing English translation: {entry_id}')
            if re.search(r'(?<!\w)\?|\?(?=\w)', text) or '\ufffd' in text:
                raise ValueError(f'Possible encoding loss in English translation: {entry_id}')
            if type(draft['uncertain']) is not bool:
                raise ValueError(f'Invalid uncertainty flag: {entry_id}')
            uncertain += int(draft['uncertain'])
            entry['translation'] = {'language': 'en', 'text': text, 'method': 'ai-generated',
                'reviewStatus': 'unreviewed-ai-draft', 'sourceTextSha256': source_hash, 'uncertain': draft['uncertain']}
        inputs[path.relative_to(ROOT).as_posix()] = digest(path.read_bytes())
        inputs[source_path.relative_to(ROOT).as_posix()] = digest(source_raw)
    if seen != set(expected):
        raise ValueError(f'English translation collection incomplete: {len(seen)}/{len(expected)} records; {len(set(expected) - seen)} missing')
    return inputs, {'language': 'en', 'method': 'ai-generated', 'review_status': 'unreviewed-ai-draft',
                    'record_count': len(seen), 'uncertain_record_count': uncertain, 'version': '1.0.0'}


def association(target, entries):
    matched = entries.get(target['glyph'], [])
    contextual = bool(target.get('contextualIdentity'))
    status = ('blocked-contextual-identity' if contextual and matched else
              'no-exact-headword' if not matched else
              'exact-headword' if target.get('kind') == 'Characters' else 'context-review-required')
    return {**target, 'status': status, 'entryIds': [] if contextual else [entry['id'] for entry in matched],
            'candidateEntryIds': [entry['id'] for entry in matched] if contextual else [],
            'historicalRoleVerified': False}


def related_suggestions(snapshot, entries):
    """Recorded written-form relationships are suggestions, never inherited notes."""
    records = {record['glyph']: record['id'] for record in snapshot['records'] if record['kind'] == 'Characters'}
    related = defaultdict(dict)
    for head, forms in snapshot['variants']['groups'].items():
        group = list(dict.fromkeys([head, *forms]))
        for glyph in group:
            if glyph not in records:
                continue
            for candidate in group:
                if candidate == glyph or candidate not in entries:
                    continue
                notes = snapshot['variants'].get('associationNotes', {}).get(head, {})
                related[glyph][candidate] = {'glyph': candidate, 'recordId': records.get(candidate),
                    'entryIds': [entry['id'] for entry in entries[candidate]], 'requiresReview': True,
                    'evidenceFile': 'public/data/character-variants-v1.4.0.json', 'groupHead': head,
                    'recordedNotes': notes}
    return {glyph: [items[key] for key in sorted(items)] for glyph, items in related.items()}


def build(snapshot, manifest):
    entries = source_entries(manifest)
    translation_inputs, translation_summary = attach_shuowen_translations(entries, manifest)
    metadata = copy.deepcopy(manifest['dataset_metadata'])
    metadata['version'] = '1.1.0'
    metadata['translation_layer'] = translation_summary
    metadata['source_name'] = 'Mandarin etymology association handoff'
    metadata['license_scope'] += ' Graphical references retain separate BabelStone provenance; no font rights or stroke bindings are granted by this export.'
    metadata['structural_source'] = snapshot['structuralSource']
    records = [association(record, entries) for record in snapshot['records']]
    forms = [association({**form, 'kind': 'Radicals'}, entries) for form in snapshot['forms']]
    associations = defaultdict(list)
    form_associations = defaultdict(list)
    for record in records:
        associations[record['glyph']].append(record)
    for form in forms:
        form_associations[form['glyph']].append(form)
    suggestions = related_suggestions(snapshot, entries)
    owners = {row['glyph']: row for row in snapshot['babelstone']}
    glyphs = set(entries) | {record['glyph'] for record in records} | {form['glyph'] for form in forms}
    shards = defaultdict(dict)
    numbered = set()
    leaf_forms = set()
    unparseable = []
    for glyph in sorted(glyphs):
        notes = entries.get(glyph, [])
        source_ids = sorted({entry['sourceId'] for entry in notes})
        structure = copy.deepcopy(owners.get(glyph))
        if structure:
            for alt_index, alternative in enumerate(structure['alternatives']):
                if alternative['parseStatus'] == 'unsupported':
                    unparseable.append({'glyph': glyph, 'alternativeIndex': alt_index, 'expression': alternative['expression']})
                for occurrence in alternative['occurrences']:
                    token = occurrence['token']
                    opaque = re.fullmatch(r'\{[0-9]+\}', token) is not None
                    if opaque:
                        numbered.add(token)
                    elif token not in ('?', '？'):
                        leaf_forms.add(token)
                    occurrence['tokenKind'] = 'babelstone-numbered' if opaque else 'unknown' if token in ('?', '？') else 'exact-form'
                    occurrence['headwordEntryIds'] = [entry['id'] for entry in entries.get(token, [])] if not opaque else []
                    occurrence['relationship'] = 'graphical-membership-only'
                    occurrence['historicalRoleVerified'] = False
        shards[shard_for(glyph)][glyph] = {'glyph': glyph, 'entries': notes,
            'associations': associations[glyph], 'radicalForms': form_associations[glyph],
            'comparison': {'coverage': 'both' if len(source_ids) == 2 else f'{source_ids[0]}-only' if source_ids else 'none',
                           'interpretationStatus': 'unreviewed' if len(source_ids) == 2 else 'not-compared'},
            'relatedFormSuggestions': suggestions.get(glyph, []), 'babelstone': structure}
    outputs = {}
    shard_inventory = {}
    for relative, characters in sorted(shards.items()):
        payload = {'$schema': '../etymology.schema.json#/$defs/shard', 'format': 'mandarin-etymology-shard',
                   'schemaVersion': 1, 'dataset_metadata': metadata, 'characters': characters}
        raw = serialized(payload)
        outputs[OUTPUT / relative] = raw
        shard_inventory[relative] = {'sha256': digest(raw), 'bytes': len(raw), 'glyphCount': len(characters)}
    record_index = {}
    for record in records:
        glyph = record['glyph']
        record_index[record['id']] = {'glyph': glyph, 'status': record['status'], 'file': shard_for(glyph)}
    form_index = {f'{form["familyId"]}/{form["formKey"]}': {**form, 'file': shard_for(form['glyph'])} for form in forms}
    inputs = {**snapshot['inputs'], **translation_inputs,
        'importer/data/etymology/manifest.json': digest((SOURCES / 'manifest.json').read_bytes().replace(b'\r\n', b'\n')),
        'public/data/etymology/etymology.schema.json': digest((OUTPUT / 'etymology.schema.json').read_bytes().replace(b'\r\n', b'\n')),
        'scripts/import-etymology.py': digest(Path(__file__).read_bytes().replace(b'\r\n', b'\n'))}
    index = {'$schema': './etymology.schema.json#/$defs/index', 'format': 'mandarin-etymology-index', 'schemaVersion': 1,
        'dataset_metadata': metadata, 'repositoryInputHashMode': 'sha256-utf8-LF; upstream file hashes preserve original bytes',
        'inputs': inputs, 'shards': shard_inventory, 'records': record_index, 'radicalForms': form_index}
    outputs[OUTPUT / 'index.json'] = serialized(index)
    source_glyphs = {source: {glyph for glyph, notes in entries.items() if any(entry['sourceId'] == source for entry in notes)}
                     for source in ('howell', 'shuowen')}
    target_glyphs = {target['glyph'] for target in [*records, *forms]}
    duplicate_heads = {glyph: [entry['id'] for entry in notes if entry['sourceId'] == 'shuowen'] for glyph, notes in entries.items()
                       if sum(entry['sourceId'] == 'shuowen' for entry in notes) > 1}
    report = {'$schema': '../public/data/etymology/etymology.schema.json#/$defs/audit',
        'format': 'mandarin-etymology-association-audit', 'schemaVersion': 1, 'dataset_metadata': metadata,
        'inputs': inputs, 'summary': {
            'sourceEntries': dict(Counter(entry['sourceId'] for notes in entries.values() for entry in notes)),
            'shuowenEnglishDrafts': translation_summary['record_count'],
            'uncertainShuowenEnglishDrafts': translation_summary['uncertain_record_count'],
            'catalogueRecords': dict(Counter(record['kind'] for record in records)), 'radicalFormRecords': len(forms),
            'associationStatuses': dict(Counter(record['status'] for record in records)),
            'formStatuses': dict(Counter(form['status'] for form in forms)),
            'sharedSourceHeadwords': len(source_glyphs['howell'] & source_glyphs['shuowen']),
            'sharedCharacterRecords': sum(record['kind'] == 'Characters' and record['glyph'] in source_glyphs['howell'] & source_glyphs['shuowen'] for record in records),
            'exactHeadwordMatchesByKind': {source: {kind: sum(record['kind'] == kind and record['glyph'] in heads for record in records)
                 for kind in ('Characters', 'Components', 'Radicals')} for source, heads in source_glyphs.items()},
            'babelstoneLeafHeadwordMatches': {source: len(leaf_forms & heads) for source, heads in source_glyphs.items()},
            'babelstoneLeafHeadwordMatchesBoth': len(leaf_forms & source_glyphs['howell'] & source_glyphs['shuowen']),
            'babelstoneNumberedTokens': len(numbered), 'shardCount': len(shards)},
        'unmatchedSourceHeadwords': {source: sorted(heads - target_glyphs) for source, heads in source_glyphs.items()},
        'duplicateShuowenHeadwords': duplicate_heads,
        'contextReviewTargets': [record['id'] for record in records if record['status'] == 'context-review-required'],
        'blockedContextualForms': [form for form in forms if form['status'] == 'blocked-contextual-identity'],
        'staleBabelstoneBindings': [{key: row[key] for key in ('glyph', 'sidecar', 'currentTreeChecksum', 'recordedTreeChecksum')}
                                  for row in snapshot['babelstone'] if row['status'] == 'stale-tree-binding'],
        'unsupportedBabelstoneExpressions': unparseable,
        'numberedTokens': sorted(numbered), 'historicalInterpretationsVerified': 0,
        'limitations': ['Shared headwords do not verify historical agreement.',
            'Component and radical roles require review; exact-headword associations alone never establish those roles.',
            'Only current-tree-bound direct-G graphical relations are exported. Geometry is not loaded, validated or exported.',
            'Numbered/unknown tokens are not lexical identities; suggested substitutions are never applied.',
            'Original source text remains unchanged. Shuowen English is a separately source-bound AI draft, not scholarly reviewed.']}
    outputs[REPORT] = serialized(report)
    return outputs, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    with redirect_stdout(io.StringIO()):
        load_downloader().check()
    manifest = json.loads((SOURCES / 'manifest.json').read_text(encoding='utf-8'))
    with tempfile.TemporaryDirectory(prefix='mandarin-etymology-') as directory:
        snapshot_path = Path(directory) / 'catalogue-context.json'
        subprocess.run(['node', str(ROOT / 'scripts/export-etymology-context.mjs'), str(snapshot_path)], cwd=ROOT, check=True)
        snapshot = json.loads(snapshot_path.read_text(encoding='utf-8'))
    outputs, report = build(snapshot, manifest)
    expected_shards = {path.resolve() for path in outputs if path.parent == OUTPUT / 'glyphs'}
    stale = {path.resolve() for path in (OUTPUT / 'glyphs').glob('*.json')} - expected_shards
    if stale:
        raise ValueError('Old generated shards require explicit review before removal: ' + ', '.join(path.name for path in sorted(stale)))
    for path, raw in outputs.items():
        if args.check:
            if not path.exists() or path.read_bytes().replace(b'\r\n', b'\n') != raw:
                raise ValueError(f'Missing or stale output: {path.relative_to(ROOT)}; run --write')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    print(json.dumps({'mode': 'checked' if args.check else 'written', 'files': len(outputs), 'summary': report['summary']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
