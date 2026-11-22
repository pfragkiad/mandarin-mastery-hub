#!/usr/bin/env python3
"""Add public font slices for vocabulary glyphs absent from the existing font faces.

Requests contain fixed public font-family names only. Glyph selection and WOFF2
character-map checks happen locally; no vocabulary text is sent to Google Fonts.
Requires fontTools and Brotli. Cache downloaded fonts outside the repository.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'}


def points(value):
    result = set()
    for part in value.split(','):
        ends = [int(x, 16) for x in part.strip()[2:].split('-')]
        result.update(range(ends[0], ends[-1] + 1))
    return result


def unicode_range(values):
    ranges = []
    for point in sorted(values):
        if ranges and point == ranges[-1][1] + 1:
            ranges[-1][1] = point
        else:
            ranges.append([point, point])
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in ranges)


def fetch(url):
    for attempt in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def extend(cache, label):
    cache = cache.resolve()
    if cache == ROOT or ROOT in cache.parents:
        raise ValueError('Font cache must remain outside the repository')
    cache.mkdir(parents=True, exist_ok=True)
    css_path = ROOT / 'src/styles.css'
    css = css_path.read_text('utf-8')
    text = ''.join(path.read_text('utf-8') for path in (ROOT / 'src/data/vocabulary').glob('*.json'))
    chars = {ord(c) for c in text if 0x3400 <= ord(c) <= 0x9FFF or 0x20000 <= ord(c) <= 0x3FFFF}
    reports, rules = [], []
    for family, google in [('Tutor Vocabulary Kai', 'LXGW WenKai TC'), ('Tutor Vocabulary Serif', 'Noto Serif SC')]:
        covered = set()
        for face in re.findall(r"@font-face \{ font-family: '" + family + r"';[^}]*unicode-range: ([^;]+);", css):
            covered.update(points(face))
        missing = chars - covered
        if not missing:
            continue
        # The request deliberately contains no text= argument or repository content.
        request = 'https://fonts.googleapis.com/css2?' + urllib.parse.urlencode({'family': google + ':wght@400'})
        sheet = fetch(request).decode()
        faces = []
        for block in re.findall(r'@font-face\s*\{([^}]+)\}', sheet):
            url = re.search(r'url\((https[^)]+)\)', block)
            ranges = re.search(r'unicode-range:\s*([^;]+);', block)
            if url and ranges and points(ranges[1]) & missing:
                faces.append((url[1], ranges[1], points(ranges[1]) & missing))

        def verify(face):
            url, ranges, wanted = face
            path = cache / (hashlib.sha256(url.encode()).hexdigest() + '.woff2')
            data = path.read_bytes() if path.exists() else fetch(url)
            actual = set(TTFont(io.BytesIO(data)).getBestCmap())
            if not wanted <= actual:
                raise ValueError('Public font slice lacks the required glyphs')
            path.write_bytes(data)
            return {'url': url, 'unicodeRange': ranges, 'addedUnicodeRange': unicode_range(wanted), 'bytes': len(data),
                    'sha256': hashlib.sha256(data).hexdigest(), 'verifiedMissingGlyphs': len(wanted)}

        verified = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for count, face in enumerate(pool.map(verify, faces), 1):
                verified.append(face)
                if count % 20 == 0 or count == len(faces):
                    print(f'{family}: verified {count}/{len(faces)} public slices', flush=True)
        actual = set().union(*(points(face['unicodeRange']) for face in verified))
        if not missing <= actual:
            raise ValueError('Public font coverage incomplete')
        for face in verified:
            rules.append(f"@font-face {{ font-family: '{family}'; src: url('{face['url']}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; unicode-range: {face['addedUnicodeRange']}; }}")
        reports.append({'family': family, 'newCharacters': len(missing), 'stylesheetRequest': request,
                        'allNewGlyphsVerified': True, 'slices': verified})
    if rules:
        addition = f'/* {label}: public font slices; new glyphs verified locally without text-subset requests. */\n' + '\n'.join(rules) + '\n'
        css_path.write_text(css.replace('@custom-variant dark (&:is(.dark *));', '@custom-variant dark (&:is(.dark *));\n' + addition, 1), 'utf-8')
    return reports


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--label', default='Vocabulary additions')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = extend(args.cache, args.label)
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + '\n', 'utf-8')
