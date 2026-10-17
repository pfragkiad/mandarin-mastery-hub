"""Export exact sourced radical identities without changing catalogue records.

Inputs: supplied mirror audit, pinned Unicode 17 CJKRadicals.txt and the
NamesList radical-supplement section. No shape/NFKC/dictionary inference.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'scripts/data/radical-identities'
audit = json.loads((INPUT / 'review.json').read_text())
catalog = json.loads((ROOT / 'public/data/catalog.json').read_text())
canonical = {}
for glyph, _, _, note, *_ in catalog['radicals']:
    match = re.search(r'Radical #(\d+)\b', note)
    if not match:
        raise ValueError(f'Missing explicit radical number: {glyph}')
    canonical[int(match[1])] = glyph
assert sorted(canonical) == list(range(1, 215))
sources = {v['source']['id']: v['source'] for v in audit['matchedBabelstoneRadicalForms'].values()}
identities = {}

def add(glyph, kind, numbers, equivalents, source_id):
    item = identities.setdefault(glyph, {'glyph': glyph, 'kind': kind, 'radicals': [], 'equivalentGlyphs': [], 'sourceIds': []})
    priority = {'symbol': 0, 'variant': 1, 'canonical': 2}
    if priority[kind] > priority[item['kind']]:
        item['kind'] = kind
    for number in numbers:
        radical = {'id': f'kangxi-{number}', 'number': number, 'glyph': canonical[number]}
        if radical not in item['radicals']:
            item['radicals'].append(radical)
    item['radicals'].sort(key=lambda r: r['number'])
    item['equivalentGlyphs'] = sorted(set(item['equivalentGlyphs'] + equivalents) - {glyph})
    item['sourceIds'] = sorted(set(item['sourceIds'] + [source_id]))

for glyph, item in audit['matchedBabelstoneRadicalForms'].items():
    numbers = [r['number'] for r in item['radicals']]
    assert all(canonical[r['number']] == r['glyph'] for r in item['radicals'])
    add(glyph, item['kind'], numbers, item['equivalentGlyphs'], item['source']['id'])
    # The audited exact ordinary/symbol pairs are reciprocal, not general aliases.
    for equivalent in item['equivalentGlyphs']:
        if 0x2E80 <= ord(equivalent) <= 0x2FDF:
            add(equivalent, 'symbol', numbers, [glyph], item['source']['id'])

def unicode_source(filename, url):
    checksum = hashlib.sha256((INPUT / filename).read_bytes()).hexdigest()
    sid = f'Unicode UCD:17.0.0:{checksum}'
    sources[sid] = {'id': sid, 'provider': 'Unicode UCD', 'version': '17.0.0', 'checksum': checksum, 'license': 'Unicode License V3', 'source_url': url}
    return sid

sid = unicode_source('CJKRadicals.txt', 'https://www.unicode.org/Public/17.0.0/ucd/CJKRadicals.txt')
for line in (INPUT / 'CJKRadicals.txt').read_text().splitlines():
    fields = line.split('#')[0].strip().split(';')
    if len(fields) != 3:
        continue
    label, symbol, ordinary = (f.strip() for f in fields)
    number = int(label.rstrip("'"))
    glyph = chr(int(ordinary, 16))
    symbol = chr(int(symbol, 16)) if symbol else None
    kind = 'canonical' if not label.endswith("'") else 'variant'
    if kind == 'canonical':
        assert glyph == canonical[number]
    add(glyph, kind, [number], [symbol] if symbol else [], sid)
    if symbol:
        add(symbol, 'symbol', [number], [glyph], sid)

# NamesList explicitly identifies supplement symbols as variants of a numbered
# Kangxi radical. Cross-references are NOT treated as equivalences.
sid = unicode_source('NamesList-supplement.txt', 'https://www.unicode.org/Public/17.0.0/ucd/NamesList.txt')
symbol = None
for line in (INPUT / 'NamesList-supplement.txt').read_text().splitlines():
    heading = re.match(r'^([0-9A-F]+)\t', line)
    if heading:
        code = int(heading[1], 16)
        symbol = chr(code) if 0x2E80 <= code <= 0x2EFF else None
    match = re.search(r'variant of Kangxi Radical (\d+)\b', line)
    if symbol and match:
        add(symbol, 'symbol', [int(match[1])], [], sid)

for glyph in ['丆', '可', '〡', '㇑', '⿰']:
    assert glyph not in identities, f'False positive: {glyph}'
output = {'schemaVersion': 1, 'sources': sources, 'identities': identities,
          'coverage': {'canonicalRadicals': 214, 'identityGlyphs': len(identities),
                       'auditSha256': hashlib.sha256((INPUT / 'review.json').read_bytes()).hexdigest()}}
destination = ROOT / 'public/data/radical-identities.json'
destination.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Exported {len(identities)} exact identities; 214 canonical radicals preserved.')