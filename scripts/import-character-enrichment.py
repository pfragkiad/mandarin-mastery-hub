"""Split supplied reference annotations into immutable per-character sidecars.

Usage: python3 scripts/import-character-enrichment.py /path/to/character-enrichment.json
Does not modify the canonical catalogue. This is a handoff adapter, not the upstream
audit generator; regeneration of the evidence still requires its original inputs.
"""
import hashlib
import json
import pathlib
import sys


def tree_encoding(node):
    if node is None:
        return None
    if node.get('children'):
        return [node['glyph'], *[tree_encoding(child) for child in node['children']]]
    return None if node['glyph'] in ('？', '?') else node['glyph']


def fingerprint(node):
    return hashlib.sha256((json.dumps(tree_encoding(node), ensure_ascii=False,
                                    separators=(',', ':')) + '\n').encode()).hexdigest()


def main():
    raw = pathlib.Path(sys.argv[1]).read_bytes()
    data = json.loads(raw)
    assert data['format'] == 'mandarin-character-enrichment' and data['schemaVersion'] == 1
    assert data['reviewStatus'] == 'unreviewed-source-annotations'
    root = pathlib.Path(__file__).resolve().parents[1]
    catalogue = json.loads((root / 'public/data/catalog.json').read_text())
    output = root / 'public/data/character-enrichment'
    output.mkdir(parents=True, exist_ok=True)
    counts = {'compatibleTrees': 0, 'incompatibleTrees': 0}
    for glyph, record in data['characters'].items():
        assert len(glyph) == 1
        compatible = fingerprint(catalogue['trees'].get(glyph)) == record['bindings']['treeChecksum']
        counts['compatibleTrees' if compatible else 'incompatibleTrees'] += 1
        count = record['bindings']['strokeCount']
        indices = [i for group in record['mapping']['groups'] for i in group['strokeIndices']]
        indices += record['mapping']['unknownStrokeIndices']
        assert sorted(indices) == list(range(count)), glyph
        payload = {'format': data['format'], 'schemaVersion': 1,
                   'reviewStatus': data['reviewStatus'], 'geometryRegion': data['geometryRegion'],
                   'character': glyph, 'record': record}
        (output / f'{ord(glyph):x}.json').write_text(json.dumps(payload, ensure_ascii=False,
                                                                separators=(',', ':')) + '\n')
    manifest = {key: data[key] for key in ('format', 'schemaVersion', 'generatorVersion',
                                          'sources', 'inputs', 'consumerPolicy', 'licenseNotices', 'summary')}
    manifest.update({'handoffSha256': hashlib.sha256(raw).hexdigest(), 'treeCompatibility': counts})
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(counts))


if __name__ == '__main__':
    main()