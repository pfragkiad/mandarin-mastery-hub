#!/usr/bin/env python3
"""Batch-import memory pictures (mnemonics).

Drop images into importer/data/mnemonics/ (or --input DIR), named by the exact glyph or its
code point: 辶.png, 木.jpg, 8fb6.png, U+8FB6.webp. Each is cropped to a centred square, resized to
1024 px WebP, uploaded with lovable-assets, and its pointer written to
src/assets/mnemonics/<code point>.webp.asset.json (the name src/lib/mnemonics.ts reads).

Optional captions: captions.json ({"辶": "Walk along a path"} or keyed by code point) or
captions.csv (glyph,caption) in the input folder; merged into src/data/mnemonics.json.
Each imported picture also records its own background colour ("paper"), which the app uses for the
covered character band and the detail preview's letterbox.

Names that are not exactly one character or one code point are skipped and reported, never guessed.
Existing pointers are skipped unless --replace (which uploads a new asset; old CDN files remain).

Usage: python3 scripts/import-mnemonics.py [--input DIR] [--batch-size 50] [--replace] [--dry-run]
Images are processed in batches; rerun to continue after an interruption.
"""
import argparse, csv, json, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/mnemonics'
CAPTIONS = ROOT / 'src/data/mnemonics.json'
EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.bmp', '.tif', '.tiff'}

def code_point(stem: str):
    m = re.fullmatch(r'(?:[Uu]\+?)?([0-9A-Fa-f]{4,6})', stem)
    if m: return m.group(1).lower()
    chars = list(stem)
    return format(ord(chars[0]), 'x') if len(chars) == 1 and ord(chars[0]) >= 0x2e80 else None

def read_captions(folder: Path):
    found = {}
    if (folder / 'captions.json').exists():
        found.update(json.loads((folder / 'captions.json').read_text('utf-8')))
    if (folder / 'captions.csv').exists():
        with open(folder / 'captions.csv', encoding='utf-8') as f:
            for row in csv.reader(f):
                if len(row) >= 2 and row[0].strip(): found[row[0].strip()] = row[1].strip()
    out = {}
    for key, text in found.items():
        cp = code_point(key)
        if cp and text: out[cp] = text
        else: print(f'skip caption {key!r}: not one glyph or code point')
    return out

def convert(src: Path, dest: Path, size: int):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        ImageOps.fit(im, (size, size), Image.LANCZOS).save(dest, 'WEBP', quality=82, method=6)

def paper_colour(im: Image.Image) -> str:
    """The picture's own background: the average of its four corner patches. The app paints the
    covered character band and the detail preview's letterbox in this colour, so neither shows a
    seam against the artwork (the corner patches are background in every picture supplied so far)."""
    w, h = im.size
    total, n = [0, 0, 0], 0
    for cx, cy in ((6, 6), (w - 7, 6), (6, h - 7), (w - 7, h - 7)):
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                r, g, b = im.getpixel((max(0, min(w - 1, cx + dx)), max(0, min(h - 1, cy + dy))))
                total[0] += r; total[1] += g; total[2] += b; n += 1
    return '#%02x%02x%02x' % tuple(round(t / n) for t in total)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default=str(ROOT / 'importer/data/mnemonics'))
    ap.add_argument('--batch-size', type=int, default=50)
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--replace', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    folder = Path(a.input); OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in EXTS)
    todo, seen = [], {}
    for p in files:
        cp = code_point(p.stem)
        if not cp: print(f'skip {p.name}: name is not one glyph or code point'); continue
        if cp in seen: print(f'skip {p.name}: duplicate of {seen[cp]}'); continue
        seen[cp] = p.name
        if (OUT / f'{cp}.webp.asset.json').exists() and not a.replace: continue
        todo.append((cp, p))
    print(f'{len(files)} images, {len(todo)} to import')
    done, papers = 0, {}
    for start in range(0, len(todo), a.batch_size):
        batch = todo[start:start + a.batch_size]
        print(f'batch {start // a.batch_size + 1}: {len(batch)} images')
        with tempfile.TemporaryDirectory() as tmp:
            for cp, p in batch:
                webp = Path(tmp) / f'{cp}.webp'
                try:
                    convert(p, webp, a.size)
                    paper = paper_colour(Image.open(webp))
                except Exception as e: print(f'  fail {p.name}: {e}'); continue
                if a.dry_run: print(f'  would upload {p.name} -> {cp} ({webp.stat().st_size // 1024} KB, paper {paper})'); continue
                r = subprocess.run(['lovable-assets', 'create', '--file', str(webp), '--filename', f'{cp}.webp'], capture_output=True, text=True)
                if r.returncode or not r.stdout.strip().startswith('{'): print(f'  fail {p.name}: {r.stderr.strip()}'); continue
                (OUT / f'{cp}.webp.asset.json').write_text(r.stdout.strip() + '\n', 'utf-8')
                papers[cp] = paper
                done += 1; print(f'  {p.name} -> {chr(int(cp, 16))} {cp} (paper {paper})')
    caps = read_captions(folder)
    if (caps or papers) and not a.dry_run:
        data = json.loads(CAPTIONS.read_text('utf-8')) if CAPTIONS.exists() else {}
        for cp, text in caps.items(): data.setdefault(cp, {})['caption'] = text
        for cp, paper in papers.items(): data.setdefault(cp, {})['paper'] = paper
        CAPTIONS.write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, indent=2) + '\n', 'utf-8')
        print(f'{len(caps)} captions, {len(papers)} paper colours merged')
    print(f'imported {done}')

if __name__ == '__main__':
    sys.exit(main())
