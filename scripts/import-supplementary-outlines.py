#!/usr/bin/env python3
"""Import reviewed supplementary handwriting outlines for forms Hanzi Writer Data lacks.

Hanzi Writer Data has no file for some radical forms (e.g. the four-stroke grass ⺿).
For each entry in REVIEWED below, a person explicitly approved one exact AnimCJK SVG
as that form's outline. Nothing is matched by shape or searched automatically.

AnimCJK SVGs are Make Me a Hanzi geometry flipped into SVG space
(svgY = 900 - hanziWriterY), so every coordinate pair is flipped back without any
other change. Outline paths come from the numbered `d` paths; medians come from the
clip-path animation paths in the same stroke order. The script fails closed when the
stroke count differs from the radical file's recorded sequence for that exact form.

Outputs:
  public/data/supplementary-outlines/<hex>.json  — geometry + provenance (lazy loaded)
  src/data/supplementary-outlines.json            — tiny manifest of covered glyphs
"""
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://raw.githubusercontent.com/parsimonhi/animCJK/master'

# Reviewed by the project owner (Nov 2026): ⺿ uses AnimCJK's Taiwan-style (ZhHant) 艹,
# which AnimCJK draws with 4 strokes in the order 竖 横 横 撇, matching the radical file.
REVIEWED = [
    {
        'character': '⺿', 'family': 140,
        'folder': 'svgsZhHant', 'recordedAs': '艹', 'style': 'Taiwan (ZhHant)',
        'reviewNote': 'AnimCJK records this outline under 艹 in Taiwan style; linked to ⺿ by owner review.',
    },
]

PAIR = re.compile(r'(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)')


def flip_path(d: str) -> str:
    """Flip every absolute coordinate pair back into Hanzi Writer space (y up, baseline 900)."""
    if re.search(r'[a-y]', d.replace('e', '')):
        sys.exit(f'Relative path commands are not supported: {d[:40]}')
    out = []
    for cmd, args in re.findall(r'([MLCQZ])([^MLCQZ]*)', d):
        pairs = PAIR.findall(args)
        out.append(' '.join([cmd] + [f'{float(x):g} {900 - float(y):g}' for x, y in pairs]))
    return ' '.join(out)


def flip_median(d: str) -> list[list[float]]:
    return [[float(x), 900 - float(y)] for x, y in PAIR.findall(d)]


def recorded_count(character: str, family: int) -> int:
    source = json.loads((ROOT / 'public/data/radical-families-source.json').read_text())
    for fam in source['radicals']:
        if fam['id'] == family:
            for form in fam.get('forms', []):
                if form.get('character') == character:
                    return len(form['strokeSequence'])
    sys.exit(f'{character} is not a recorded form of radical #{family}')


def main() -> None:
    manifest = {}
    out_dir = ROOT / 'public/data/supplementary-outlines'
    out_dir.mkdir(parents=True, exist_ok=True)
    for entry in REVIEWED:
        point = ord(entry['recordedAs'])
        url = f"{BASE}/{entry['folder']}/{point}.svg"
        raw = urllib.request.urlopen(url).read()
        svg = raw.decode('utf-8')
        prefix = f'z{point}'
        strokes = {int(n): d for n, d in re.findall(rf'<path id="{prefix}d(\d+)" d="([^"]+)"', svg)}
        medians = {int(n): d for n, d in re.findall(rf'clip-path="url\(#{prefix}c(\d+)\)" d="([^"]+)"', svg)}
        order = sorted(strokes)
        if not order or order != sorted(medians) or order != list(range(1, len(order) + 1)):
            sys.exit(f'{url}: stroke and median numbering disagree')
        expected = recorded_count(entry['character'], entry['family'])
        if len(order) != expected:
            sys.exit(f"{url}: {len(order)} strokes but the radical file records {expected} for {entry['character']}")
        record = {
            'character': entry['character'],
            'source': {
                'name': 'AnimCJK', 'url': url, 'recordedAs': entry['recordedAs'], 'style': entry['style'],
                'license': 'Arphic Public License', 'sha256': hashlib.sha256(raw).hexdigest(),
                'reviewNote': entry['reviewNote'],
            },
            'strokes': [flip_path(strokes[n]) for n in order],
            'medians': [flip_median(medians[n]) for n in order],
        }
        hex_point = format(ord(entry['character']), 'x')
        (out_dir / f'{hex_point}.json').write_text(json.dumps(record, ensure_ascii=False, indent=1) + '\n')
        manifest[entry['character']] = {'file': f'/data/supplementary-outlines/{hex_point}.json', 'recordedAs': entry['recordedAs'], 'style': entry['style']}
        print(f"{entry['character']}: {len(order)} strokes from {url}")
    (ROOT / 'src/data/supplementary-outlines.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
