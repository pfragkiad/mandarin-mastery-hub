#!/usr/bin/env python3
"""Build public/data/character-variants.json: simplified ↔ traditional script groups.

Source: Unicode Unihan 17.0.0 Unihan_Variants.txt (kTraditionalVariant / kSimplifiedVariant).
A group links one catalogue Simplified character to its catalogue Traditional forms only when
the link is recorded in BOTH directions and the traditional form has exactly one simplified
owner in the catalogue. Traditional forms shared by several simplified characters (餘 → 余/馀)
stay as their own cards. Nothing is matched by shape, reading or meaning.

Usage: python3 scripts/import-character-variants.py /path/to/Unihan_Variants.txt
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'public' / 'data' / 'catalog.json'
OUT = ROOT / 'public' / 'data' / 'character-variants.json'

def codepoints(value: str) -> list[str]:
    return [chr(int(token.split('<')[0][2:], 16)) for token in value.split()]

def main(path: str) -> None:
    trad, simp = {}, {}
    for line in open(path, encoding='utf8'):
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 3: continue
        glyph = chr(int(parts[0][2:], 16))
        if parts[1] == 'kTraditionalVariant': trad[glyph] = codepoints(parts[2])
        elif parts[1] == 'kSimplifiedVariant': simp[glyph] = codepoints(parts[2])
    script = {row[0]: (row[4] if len(row) > 4 else None) for row in json.loads(CATALOG.read_text(encoding='utf8'))['characters']}
    forward = {s: [t for t in trad.get(s, []) if t != s and script.get(t) == 'Traditional' and s in simp.get(t, [])]
               for s, kind in script.items() if kind == 'Simplified'}
    owners: dict[str, list[str]] = {}
    for s, forms in forward.items():
        for t in forms: owners.setdefault(t, []).append(s)
    groups = {s: kept for s, forms in sorted(forward.items()) if (kept := [t for t in forms if len(owners[t]) == 1])}
    OUT.write_text(json.dumps({'schemaVersion': 1, 'source': 'Unicode Unihan 17.0.0 · kTraditionalVariant/kSimplifiedVariant (mutual, single owner)', 'groups': groups}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'{len(groups)} groups, {sum(map(len, groups.values()))} traditional forms')

if __name__ == '__main__':
    main(sys.argv[1])
