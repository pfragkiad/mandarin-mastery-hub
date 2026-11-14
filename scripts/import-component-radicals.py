#!/usr/bin/env python3
"""Attach the Unihan kRSUnicode dictionary radical to each Component record.

Characters already carry "· X radical" from Unihan kRSUnicode; components get the same
sourced classification here. Only components that are NOT themselves a radical form
(residual stroke count > 0) are written: a residual-0 form IS the radical and keeps its
exact radical identity instead. Nothing is inferred from shape or decomposition.

Usage: python3 scripts/import-component-radicals.py /path/to/Unihan_IRGSources.txt
"""
import json, sys
from pathlib import Path

CATALOG = Path(__file__).resolve().parent.parent / 'public' / 'data' / 'catalog.json'
RADICALS = CATALOG.with_name('radicals.json')
COMPONENTS = CATALOG.with_name('components.json')

def main(unihan: str) -> None:
    rs: dict[str, str] = {}
    for line in open(unihan, encoding='utf8'):
        if '\tkRSUnicode\t' in line:
            cp, _, value = line.rstrip('\n').split('\t')
            rs[chr(int(cp[2:], 16))] = value.split()[0]  # first (primary) value only
    catalog = json.loads(CATALOG.read_text(encoding='utf8'))
    radicals = {}
    for row in json.loads(RADICALS.read_text(encoding='utf8'))['radicals']:
        if 'Radical #' in row[3]:
            radicals[int(row[3].split('Radical #')[1].split()[0])] = row[0]
    out: dict[str, str] = {}
    for row in json.loads(COMPONENTS.read_text(encoding='utf8'))['components']:
        value = rs.get(row[0])
        if not value:
            continue
        number, residual = value.split('.')
        glyph = radicals.get(int(number.rstrip("'\"!")))
        if glyph and int(residual) > 0 and glyph != row[0]:
            out[row[0]] = glyph
    catalog['componentRadicals'] = out
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{len(out)} component radicals written')

if __name__ == '__main__':
    main(sys.argv[1])
