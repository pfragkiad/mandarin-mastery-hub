"""Compile only the numbered component definitions from a supplied BabelStone IDS.TXT.

Usage: python3 scripts/import-babelstone-components.py /path/to/IDS.txt
The source IDS tree stays untouched; substitutions are metadata, not identities.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_bytes()
text = raw.decode('utf-8-sig')
components = {}
for line in text.splitlines():
    # Definitions live in numbered comment rows, not ordinary character IDS rows.
    match = re.match(r'^#\s*\{(\d+)\}\s*\t(.*)$', line)
    if not match:
        continue
    identifier, body = match.groups()
    columns = body.split('\t')
    definition = columns[0].strip()
    point = re.search(r'\(([A-F0-9]{4,6})\s+[^)]+\)', definition)
    description = re.sub(r'\s*\([A-F0-9]{4,6}\s+[^)]+\)', '', definition).strip()
    replacement = columns[1].strip() if len(columns) > 1 else ''
    # Keep the suggested substitution as metadata only. The PUA code point
    # identifies the source glyph and must not be replaced in decomposition trees.
    components[identifier] = {
        'id': int(identifier), 'description': description or None,
        'codePoint': int(point[1], 16) if point else None,
        'suggestedSubstitution': replacement if replacement not in ('', '？', '?') else None,
    }
# Pin the two source mappings that prompted this importer.
assert components['48']['codePoint'] == 0xF5FC
assert components['100']['codePoint'] == 0xF3BE
output = {
    'source': 'BabelStone IDS.TXT', 'sourceUrl': 'https://babelstone.co.uk/CJK/IDS.TXT',
    'date': re.search(r'^# File Date: (.+)$', text, re.M)[1],
    'sha256': hashlib.sha256(raw).hexdigest(), 'components': components,
}
target = Path('src/data/babelstone-components.json')
target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(f'Compiled {len(components)} numbered definitions into {target}')