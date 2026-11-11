"""Builds the small Words/Phrases font files that keep the chosen character style on phones.

Why: phones have no KaiTi/Songti, so the handwritten and print styles come from Google's
web fonts, which arrive in ~100 separate slices. On a phone connection a word's characters
show in the system fallback (often mixed slice-by-slice) until every slice lands. These two
files hold exactly the glyphs src/data/vocabulary.json uses — the same LXGW WenKai TC and
Noto Serif SC designs, fetched through Google Fonts' `text=` subsetting — so a whole word
switches style at once from one small download.

Usage: python3 scripts/build-vocabulary-fonts.py <out dir>
Then upload each file with lovable-assets, and paste the printed unicode-range into the two
'Tutor Vocabulary' @font-face rules in src/styles.css (src/lib/vocabulary-fonts.test.ts fails
when the vocabulary gains a character the files lack)."""
import io, re, sys, pathlib, urllib.parse, urllib.request

out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
text = (pathlib.Path(__file__).parent.parent / "src/data/vocabulary.json").read_text(encoding="utf8")

def keep(c: str) -> bool:
    o = ord(c)  # Han blocks plus CJK and full-width punctuation used inside phrases
    return 0x3400 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or 0x20000 <= o <= 0x3FFFF or 0x2E80 <= o <= 0x2FDF or 0x3000 <= o <= 0x303F or 0xFF00 <= o <= 0xFFEF

chars = "".join(sorted({c for c in text if keep(c)}))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"  # woff2 response
for family, name in (("LXGW+WenKai+TC", "vocabulary-kai.woff2"), ("Noto+Serif+SC", "vocabulary-serif.woff2")):
    url = f"https://fonts.googleapis.com/css2?family={family}&text=" + urllib.parse.quote(chars)
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read().decode()
    data = urllib.request.urlopen(re.search(r"url\((https[^)]+)\)", css).group(1)).read()
    (out / name).write_bytes(data)
    print(name, len(data), "bytes")

# Collapse the code points into the shortest unicode-range list.
points, ranges = sorted(ord(c) for c in chars), []
for p in points:
    if ranges and p == ranges[-1][1] + 1: ranges[-1][1] = p
    else: ranges.append([p, p])
print(f"{len(chars)} characters")
print("unicode-range: " + ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in ranges) + ";")
