#!/usr/bin/env python3
"""Build public/data/finder-medians.json — the Hanzi finder's comparison index.

Purpose: the Hanzi finder (src/lib/hanzi-finder.ts) compares a learner's drawing
with every catalogue glyph's recorded stroke centre lines. Loading 9,000 Hanzi
Writer files one by one is impossible in a browser, so this script packs only
the recorded medians into one compact, lazily loaded file.

Sources (recorded geometry only, never inferred):
  * hanzi-writer-data 2.0.1 (derived from Make Me a Hanzi, Arphic Public License),
    downloaded from the npm registry and checked against RECORDED_SHA256.
  * Owner-reviewed supplementary outlines in public/data/supplementary-outlines,
    but only those recorded under the same exact code point (recordedAs == glyph);
    reviewed look-alike links stay Practice-only so a drawing of 冗 never "finds" ⺴.

Glyph list: every exact glyph in characters.json, components.json and radicals.json.
Glyphs with no recorded geometry are left out (fail closed) and listed in `missing`.

Encoding: each stroke's median is resampled to POINTS equidistant points in
Hanzi Writer space (x 0..1024, y up from -124..900), flipped to y-down
((900 - y) / 1024), quantised to GRID levels and written as one base64-alphabet
character per coordinate, so a glyph is one string of strokes * POINTS * 2 chars.

Run from the repository root: python3 scripts/build-finder-medians.py
"""
import hashlib, io, json, math, os, tarfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARBALL = 'https://registry.npmjs.org/hanzi-writer-data/-/hanzi-writer-data-2.0.1.tgz'
RECORDED_SHA256 = '72baf3d82b114e60d6e40ea05f24d2262a05cd39d544e2f322ba2fceb7beff15'
POINTS = 8
GRID = 64
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
OUT = os.path.join(ROOT, 'public', 'data', 'finder-medians.json')


def resample(points, n=POINTS):
    """Equidistant resampling along the polyline; a single point repeats."""
    pts = [(float(x), float(y)) for x, y in points]
    if len(pts) == 1:
        return pts * n
    lengths = [0.0]
    for a, b in zip(pts, pts[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    total = lengths[-1]
    if total == 0:
        return [pts[0]] * n
    out, j = [], 0
    for i in range(n):
        target = total * i / (n - 1)
        while j < len(pts) - 2 and lengths[j + 1] < target:
            j += 1
        seg = lengths[j + 1] - lengths[j]
        t = 0 if seg == 0 else (target - lengths[j]) / seg
        a, b = pts[j], pts[j + 1]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def quant(value):
    return ALPHABET[max(0, min(GRID - 1, round(value * (GRID - 1))))]


def encode(medians):
    chars = []
    for median in medians:
        for x, y in resample(median):
            chars.append(quant(x / 1024))
            chars.append(quant((900 - y) / 1024))
    return ''.join(chars)


def main():
    raw = urllib.request.urlopen(TARBALL).read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != RECORDED_SHA256:
        raise SystemExit(f'hanzi-writer-data tarball checksum changed: {digest}')
    package = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as tar:
        for member in tar.getmembers():
            name = member.name.removeprefix('package/')
            if name.endswith('.json') and name != 'package.json' and '/' not in name:
                package[name[:-5]] = member
        glyphs = []
        for file, key in (('characters', 'characters'), ('components', 'components'), ('radicals', 'radicals')):
            rows = json.load(open(os.path.join(ROOT, 'public', 'data', f'{file}.json'), encoding='utf-8'))[key]
            glyphs += [row[0] for row in rows]
        manifest = json.load(open(os.path.join(ROOT, 'src', 'data', 'supplementary-outlines.json'), encoding='utf-8'))
        index, sources, missing = {}, {}, []
        for glyph in dict.fromkeys(glyphs):
            if glyph in package:
                medians = json.load(tar.extractfile(package[glyph]))['medians']
                index[glyph] = encode(medians)
            elif glyph in manifest and manifest[glyph]['recordedAs'] == glyph:
                record = json.load(open(os.path.join(ROOT, 'public', manifest[glyph]['file'].lstrip('/')), encoding='utf-8'))
                if record['character'] != glyph:
                    raise SystemExit(f'supplementary outline names {record["character"]}, expected {glyph}')
                index[glyph] = encode(record['medians'])
                sources[glyph] = record['source']['name']
            else:
                missing.append(glyph)
    out = {
        'about': 'Hanzi finder comparison index: recorded stroke medians only, resampled and quantised. Built by scripts/build-finder-medians.py.',
        'source': {'name': 'hanzi-writer-data', 'version': '2.0.1', 'derivedFrom': 'Make Me a Hanzi', 'license': 'Arphic Public License', 'tarball': TARBALL, 'sha256': RECORDED_SHA256},
        'supplementary': sources,
        'points': POINTS, 'grid': GRID, 'alphabet': ALPHABET,
        'missing': missing,
        'glyphs': index,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    # Tiny static copy of `missing` so detail cards can offer "Find similar" only for
    # glyphs the index covers, without fetching the whole index.
    with open(MISSING_OUT, 'w', encoding='utf-8') as f:
        json.dump({'about': 'Catalogue glyphs without recorded finder geometry; copy of finder-medians.json missing, written by scripts/build-finder-medians.py.', 'missing': missing}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{len(index)} glyphs, {len(missing)} without recorded geometry, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
