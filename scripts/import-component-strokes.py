"""Fill missing component stroke counts from Unicode Unihan kTotalStrokes.

Run: python3 scripts/import-component-strokes.py
Reads the Unihan 17.0.0 database (downloaded from unicode.org) and updates only
public/data/components.json rows whose note is exactly "Component" (no count
recorded) and whose glyph has exactly one kTotalStrokes value. Rows already
carrying a count, and CJK Radicals Supplement symbols (⺀, ⺮ ... which Unihan
does not cover), stay untouched, so no count is ever guessed from shape.
scripts/import-radical-strokes.ts then reads these counts for radical-family
forms the family source leaves at null (e.g. 𧢲 in family #148).
"""
import io, json, re, urllib.request, zipfile

URL = 'https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip'
data = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(URL).read()))
totals = {}
for line in data.read('Unihan_IRGSources.txt').decode('utf8').splitlines():
    parts = line.split('\t')
    if len(parts) == 3 and parts[1] == 'kTotalStrokes':
        totals[chr(int(parts[0][2:], 16))] = parts[2].split()

path = 'public/data/components.json'
file = json.load(open(path, encoding='utf8'))
filled = []
for row in file['components']:
    values = totals.get(row[0])
    if row[3] == 'Component' and values and len(set(values)) == 1:
        n = int(values[0])
        row[3] = f"{n} {'stroke' if n == 1 else 'strokes'} · Component"
        filled.append(row[0])
text = '{\n  "components": [\n' + ',\n'.join('    ' + json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in file['components']) + '\n  ]\n}\n'
open(path, 'w', encoding='utf8').write(text)
print('Filled', len(filled), 'component stroke counts from Unihan kTotalStrokes:', ' '.join(filled))
