"""Export exact sourced radical identities without changing catalogue records.

Inputs: review.json and pinned Unicode text files in importer/data/radical-identities/,
plus the explicit component metadata review in importer/data/components/.
No shape/NFKC/dictionary inference.
"""
import hashlib
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='Verify the generated sidecar without writing it.')
args = parser.parse_args()
INPUT = ROOT / 'importer/data/radical-identities'
REVIEW = INPUT / 'review.json'
audit = json.loads(REVIEW.read_text(encoding='utf8'))
catalog = json.loads((ROOT / 'public/data/catalog.json').read_text(encoding='utf8'))
radical_rows = json.loads((ROOT / 'public/data/radicals.json').read_text(encoding='utf8'))['radicals']
character_rows = json.loads((ROOT / 'public/data/characters.json').read_text(encoding='utf8'))['characters']
component_rows = json.loads((ROOT / 'public/data/components.json').read_text(encoding='utf8'))['components']
canonical = {}
for glyph, _, _, note, *_ in radical_rows:
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
for line in (INPUT / 'CJKRadicals.txt').read_text(encoding='utf8').splitlines():
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
for line in (INPUT / 'NamesList-supplement.txt').read_text(encoding='utf8').splitlines():
    heading = re.match(r'^([0-9A-F]+)\t', line)
    if heading:
        code = int(heading[1], 16)
        symbol = chr(code) if 0x2E80 <= code <= 0x2EFF else None
    match = re.search(r'variant of Kangxi Radical (\d+)\b', line)
    if symbol and match:
        add(symbol, 'symbol', [int(match[1])], [], sid)

# Import only the explicitly selected component pairs. Unlike NamesList cross-references,
# Equivalent_Unified_Ideograph records the exact symbol -> ideograph relation. The
# symbol's independently recorded NamesList family supplies the family number; this
# adds presentation identities, never dictionary assignments, readings or geometry.
component_input = ROOT / 'importer/data/components'
component_review = json.loads((component_input / 'radical-family-metadata-review.json').read_text(encoding='utf8'))
assert component_review['schemaVersion'] == 1
assert component_review['sourceFile'] == '../radical-identities/EquivalentUnifiedIdeograph.txt'
assert component_review['proposalFile'] == 'cjk_component_metadata_patch.md'
assert hashlib.sha256((INPUT / 'EquivalentUnifiedIdeograph.txt').read_bytes()).hexdigest() == component_review['sourceSha256']
assert hashlib.sha256((component_input / component_review['proposalFile']).read_bytes()).hexdigest() == component_review['proposalSha256']
nameslist_sid = sid
equivalent_sid = unicode_source('EquivalentUnifiedIdeograph.txt', 'https://www.unicode.org/Public/17.0.0/ucd/EquivalentUnifiedIdeograph.txt')
equivalents = {}
for line in (INPUT / 'EquivalentUnifiedIdeograph.txt').read_text(encoding='utf8').splitlines():
    fields = [field.strip() for field in line.split('#')[0].split(';')]
    if len(fields) != 2:
        continue
    bounds = fields[0].split('..')
    for code in range(int(bounds[0], 16), int(bounds[-1], 16) + 1):
        equivalents[chr(code)] = chr(int(fields[1], 16))
seen_components = set()
for mapping in component_review['mappings']:
    glyph, symbol, number = mapping['glyph'], mapping['symbol'], mapping['family']
    assert [row for row in component_rows if row[0] == glyph] == [mapping['recordedComponentRow']], f'Component source row changed; review required: {glyph}'
    assert len(glyph) == len(symbol) == 1 and glyph not in seen_components
    seen_components.add(glyph)
    assert equivalents.get(symbol) == glyph, f'Missing exact Unicode equivalent: {glyph}'
    family_numbers = [radical['number'] for radical in identities.get(symbol, {}).get('radicals', [])]
    assert family_numbers == [number], f'Conflicting sourced family: {glyph}'
    assert nameslist_sid in identities[symbol]['sourceIds'], f'Missing NamesList family source: {symbol}'
    add(glyph, 'variant', [number], [symbol], equivalent_sid)
    add(glyph, 'variant', [number], [], nameslist_sid)
    add(symbol, 'symbol', [number], [glyph], equivalent_sid)

# Unihan kRSUnicode supplement: exact radical-position forms (residual 0) that the audited
# mirror omits, e.g. the traditional left-side metal form 釒 (167.0). Each line is copied
# verbatim from the pinned Unihan_IRGSources.txt whose checksum the file header records.
supplement = (INPUT / 'Unihan-kRSUnicode-supplement.txt').read_text(encoding='utf8')
unihan_sha = re.search(r'sha256\(Unihan_IRGSources\.txt\) = ([0-9a-f]{64})', supplement)[1]
sid = f'Unicode UCD/Unihan kRSUnicode:17.0.0:{unihan_sha}'
sources[sid] = {'id': sid, 'provider': 'Unicode UCD/Unihan', 'version': '17.0.0', 'checksum': unihan_sha, 'license': 'Unicode License V3', 'source_url': 'https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip'}
for line in supplement.splitlines():
    match = re.match(r'^U\+([0-9A-F]+)\tkRSUnicode\t(\d+)\.0$', line)
    if match:
        add(chr(int(match[1], 16)), 'variant', [int(match[2])], [], sid)
assert identities['釒']['radicals'] == [{'id': 'kangxi-167', 'number': 167, 'glyph': '金'}]

# Reviewed shared forms: one codepoint that recorded breakdowns write for two Kangxi
# families (right-side 阝 for 邑 and left-side 阝 for 阜; 月 for 肉; 日 for 曰; 夂 for 夊).
# The standalone identity above keeps Unicode's own number (阝 is 170.0 in Unihan). Inside a
# character, the character's declared Unihan radical (catalogue note "· X radical") picks
# the family when it is a candidate; only 阝 also has a positional rule, which is exported
# only because the declared radicals below prove it without a single contradiction.
# `form` is that family's recorded form in radical-strokes.json the shared glyph stands for.
SHARED_FORMS = {
    '阝': {'families': {163: '⻏', 170: '阝'}, 'positions': {'right': 163, 'left': 170}},
    '月': {'families': {74: '月', 130: '⺼'}},
    '日': {'families': {72: '日', 73: '曰'}},
    '夂': {'families': {34: '夂', 35: '夊'}},
}
OPERATORS = set('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻⿼⿽⿾⿿㇯')
number_of = {glyph: number for number, glyph in canonical.items()}
declared = {}
for glyph, _, _, note, *_ in character_rows:
    match = re.search(r'·\s*(.+?) radical$', note)
    if match and match[1] in number_of:
        declared.setdefault(glyph, number_of[match[1]])
for glyph, radical in catalog.get('componentRadicals', {}).items():
    if radical in number_of:
        declared.setdefault(glyph, number_of[radical])
strokes = json.loads((ROOT / 'public/data/radical-strokes.json').read_text(encoding='utf8'))
family_forms = {family['id']: {form['character'] for form in family['forms']} for family in strokes['families']}
evidence = {glyph: {'declared': {}, 'positional': 0, 'contradictions': []} for glyph in SHARED_FORMS}

def walk(node, owner):
    shared = SHARED_FORMS.get(node['glyph'])
    if shared:
        record = evidence[node['glyph']]
        number = declared.get(owner)
        if number in shared['families']:
            record['declared'][str(number)] = record['declared'].get(str(number), 0) + 1
            expected = shared.get('positions', {}).get(node['position'])
            if 'positions' in shared and expected != number:
                record['contradictions'].append(owner)
        elif shared.get('positions', {}).get(node['position']):
            record['positional'] += 1
    # Descending into a real component changes whose declared radical applies.
    child_owner = owner if node['glyph'] in OPERATORS or node['position'] == 'root' else node['glyph']
    for child in node.get('children', []):
        walk(child, child_owner)

for character, tree in catalog['trees'].items():
    walk(tree, character)
shared_forms = {}
for glyph, shared in SHARED_FORMS.items():
    for number, form in shared['families'].items():
        assert form in family_forms[number], f'{form} is not a recorded form of family {number}'
    record = evidence[glyph]
    assert not record['contradictions'], f'{glyph} position rule contradicted by {record["contradictions"]}'
    assert all(record['declared'].get(str(number)) for number in shared['families']), f'{glyph} lacks declared evidence'
    shared_forms[glyph] = {
        'glyph': glyph,
        'families': [{'number': number, 'glyph': canonical[number], 'form': form} for number, form in shared['families'].items()],
        **({'positions': shared['positions']} if 'positions' in shared else {}),
        'evidence': {'declaredOccurrences': record['declared'], 'positionalOccurrences': record['positional']},
        'basis': 'Character declared radical (Unihan kRSUnicode via catalogue)' + (' · position rule with zero contradictions' if 'positions' in shared else ''),
    }
assert shared_forms['阝']['evidence']['declaredOccurrences'] == {'163': 77, '170': 80}

for glyph in ['丆', '可', '〡', '㇑', '⿰']:
    assert glyph not in identities, f'False positive: {glyph}'
output = {'schemaVersion': 1, 'sources': sources, 'identities': identities, 'sharedForms': shared_forms,
          'coverage': {'canonicalRadicals': 214, 'identityGlyphs': len(identities),
                       'auditSha256': hashlib.sha256(REVIEW.read_bytes()).hexdigest(),
                       'componentMetadataReviewSha256': hashlib.sha256((component_input / 'radical-family-metadata-review.json').read_bytes()).hexdigest()}}
destination = ROOT / 'public/data/radical-identities.json'
serialized = json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n'
if args.check:
    assert destination.read_text(encoding='utf8') == serialized, 'radical-identities.json is stale; run scripts/import-radical-identities.py'
else:
    destination.write_text(serialized, encoding='utf8')
print(f'{"Verified" if args.check else "Exported"} {len(identities)} exact identities and {len(shared_forms)} shared forms; 214 canonical radicals preserved.')
for glyph, item in shared_forms.items():
    print(f'  {glyph}: {item["evidence"]}')
