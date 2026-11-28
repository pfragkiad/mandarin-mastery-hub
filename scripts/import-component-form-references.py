"""Compile four explicitly reviewed form references, without changing raw catalogue rows.

The output is a small browser-safe presentation subset; sources stay importer-only.
Run with --write to generate it or --check to verify it without writing.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'importer/data/components'
REVIEW = INPUT / 'form-reference-review.json'
OUTPUT = ROOT / 'src/data/component-form-references.json'


def compile_references():
    review = json.loads(REVIEW.read_text(encoding='utf8'))
    assert review['schemaVersion'] == 1
    rows = {kind: json.loads((ROOT / f'public/data/{kind.lower()}.json').read_text(encoding='utf8'))[kind.lower()]
            for kind in ['Characters', 'Components']}
    records = {}
    for entry in review['references']:
        glyph = entry['glyph']
        assert len(glyph) == 1 and glyph not in records
        assert entry['relation'] in ['old-variant', 'phonetic-component']
        for kind, recorded in entry['recordedRows'].items():
            assert [row for row in rows[kind] if row[0] == glyph] == [recorded], f'Changed source tuple: {glyph}'
        assert entry['description'] == entry['recordedRows']['Components'][2], f'Original description changed: {glyph}'
        assert entry['targetKind'] == 'Characters'
        target = entry['targetRow']
        assert [row for row in rows['Characters'] if row[0] == target[0]] == [target], f'Changed target tuple: {glyph}'
        assert target[0] != glyph and target[1] and target[2]
        evidence = entry['evidence']
        if entry['relation'] == 'old-variant':
            assert entry['meaningMode'] == 'shared'
            assert all(row[1] == target[1] for row in entry['recordedRows'].values()), f'Unreviewed reading change: {glyph}'
            assert evidence['sourceFile'] == '../character-readings/cedict_1_0_ts_utf-8_mdbg.txt.gz'
            raw = (INPUT / evidence['sourceFile']).read_bytes()
            assert hashlib.sha256(raw).hexdigest() == evidence['sourceSha256']
            assert evidence['sourceEntry'] in gzip.decompress(raw).decode('utf8').splitlines()
            assert evidence['sourceEntry'].startswith(glyph + ' ')
            assert '/old variant of ' in evidence['sourceEntry']
            assert target[0] in evidence['sourceEntry'], f'Target absent from dictionary evidence: {glyph}'
        else:
            assert entry['meaningMode'] == 'related-only', 'Phonetic relations cannot inherit lexical data'
            assert all(row[2] == entry['description'] for row in entry['recordedRows'].values())
        records[glyph] = entry
    assert len(records) == 4
    return {'schemaVersion': 1, 'reviewSha256': hashlib.sha256(REVIEW.read_bytes()).hexdigest(), 'references': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = json.dumps(compile_references(), ensure_ascii=False, indent=2) + '\n'
    if args.write:
        OUTPUT.write_text(output, encoding='utf8')
    else:
        assert OUTPUT.read_text(encoding='utf8') == output, 'component-form-references.json is stale'
    print(f'{"Wrote" if args.write else "Verified"} four exact form references; raw catalogue rows unchanged.')
