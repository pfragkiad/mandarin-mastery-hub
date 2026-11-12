"""Builds the small "Tutor … Extras" font files for characters Google Fonts never delivers.

Why: Google serves LXGW WenKai TC, Noto Serif SC and Noto Sans SC in ~100 slices whose
unicode-ranges skip whole blocks the catalogue needs — radical forms such as ⺝ (U+2E9D),
Kangxi radical symbols, CJK strokes and rarer Ext-A/Ext-B/basic characters used as
decomposition parts. The full fonts DO contain most of these glyphs, so without these files
a breakdown showed ⺝ in the system fallback beside 月 in the chosen Kai or print style.

Each extras file holds exactly the code points that (a) appear in src/data or public/data,
(b) fall outside that family's Google unicode-ranges, and (c) exist in the full font. It is
split into a "radicals" file (radical/Kangxi/stroke blocks, common in breakdowns) and a
"rare" file (everything else) so a page only downloads what it renders (unicode-range).
Code points outside the Google ranges never overlap them, so stacking the extras face after
the Google family changes nothing the Google family already draws.

Usage: python3 scripts/build-supplement-fonts.py <full-font dir> <out dir>
  <full-font dir> holds the google/fonts originals: LXGWWenKaiTC-Regular.ttf,
  NotoSerifSC[wght].ttf, NotoSansSC[wght].ttf (variable fonts are pinned to wght=400).
Then upload each file with lovable-assets and paste the printed @font-face rules into
src/styles.css (src/lib/supplement-fonts.test.ts checks their ranges against the data)."""
import io, json, pathlib, re, sys, urllib.request
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

src_dir, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
root = pathlib.Path(__file__).parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"

def han(o: int) -> bool:
    return (0x2E80 <= o <= 0x2FDF or 0x31C0 <= o <= 0x31EF or 0x3400 <= o <= 0x9FFF
            or 0xF900 <= o <= 0xFAFF or 0x20000 <= o <= 0x3FFFF)

used = set()
for f in [*(root / "src/data").rglob("*.json"), *(root / "public/data").rglob("*.json")]:
    used.update(o for o in map(ord, f.read_text(encoding="utf8")) if han(o))

def google_ranges(family: str) -> set:
    css = urllib.request.urlopen(urllib.request.Request(
        f"https://fonts.googleapis.com/css2?family={family}&display=swap", headers={"User-Agent": UA})).read().decode()
    covered = set()
    for rule in re.findall(r"unicode-range:([^;]*)", css):
        for part in (p.strip()[2:] for p in rule.split(",")):
            a, _, b = part.partition("-")
            covered.update(range(int(a, 16), int(b or a, 16) + 1))
    return covered

def css_range(points) -> str:
    spans = []
    for p in sorted(points):
        if spans and p == spans[-1][1] + 1: spans[-1][1] = p
        else: spans.append([p, p])
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in spans)

FAMILIES = (  # (Google family, full font file, our face name, file stem)
    ("LXGW+WenKai+TC", "LXGWWenKaiTC-Regular.ttf", "Tutor Kai Extras", "kai"),
    ("Noto+Serif+SC", "NotoSerifSC[wght].ttf", "Tutor Serif Extras", "serif"),
    ("Noto+Sans+SC", "NotoSansSC[wght].ttf", "Tutor Sans Extras", "sans"),
)
report = {}
for family, file, face, stem in FAMILIES:
    font = TTFont(src_dir / file)
    if "fvar" in font: font = instancer.instantiateVariableFont(font, {"wght": 400})
    cmap = font.getBestCmap()
    wanted = sorted(p for p in used - google_ranges(family) if p in cmap)
    groups = {"radicals": [p for p in wanted if p < 0x3400], "rare": [p for p in wanted if p >= 0x3400]}
    for part, points in groups.items():
        buf = io.BytesIO(); font.save(buf); buf.seek(0)
        f2 = TTFont(buf)
        opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]
        sub = subset.Subsetter(opts); sub.populate(unicodes=points); sub.subset(f2)
        name = f"{stem}-extras-{part}.woff2"; f2.flavor = "woff2"; f2.save(out / name)
        report[name] = {"face": face, "points": len(points), "bytes": (out / name).stat().st_size}
        print(f"/* {name}: {len(points)} glyphs */ @font-face {{ font-family: '{face}'; src: url('<{name}>') format('woff2'); "
              f"font-weight: 400; font-style: normal; font-display: swap; unicode-range: {css_range(points)}; }}", file=open(out / f"{name}.css", "w"))
print(json.dumps(report, indent=1))
