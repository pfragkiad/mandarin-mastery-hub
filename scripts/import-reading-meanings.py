#!/usr/bin/env python3
"""Apply the source-reviewed multi-reading audit without changing imported glyph rows.

The review binds every explicitly multi-reading Characters tuple, including unresolved
cases, to exact source snapshots. It is an editorial mapping, never an automatic split
of a combined English definition. Run with --write or --check from the repository root.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('importer/data/character-readings')
CATALOG = Path('public/data/catalog.json')
AUDIT = Path('reports/character-reading-meanings-audit.json')
REPORT = Path('reports/character-reading-meanings-audit.md')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def numbered(reading):
    """Compare exact tones; only Unicode composition and case are normalized."""
    marks = {'\u0304': '1', '\u0301': '2', '\u030c': '3', '\u0300': '4'}
    tone = '5'
    base = ''
    for char in unicodedata.normalize('NFD', reading.lower()):
        if char in marks:
            tone = marks[char]
        elif char == '\u0308':
            base = base[:-1] + 'u:'
        else:
            base += char
    return base + tone


def build(root=ROOT):
    review_bytes = (root / INPUT / 'review.json').read_bytes()
    review = json.loads(review_bytes)
    manifest = json.loads((root / INPUT / 'manifest.json').read_bytes())
    require(review['schemaVersion'] == manifest['schemaVersion'] == 1, 'unknown review/source schema')
    require(digest(review_bytes) == manifest['reviewSha256'], 'review checksum changed; review changes explicitly')
    for key, source in manifest['sources'].items():
        raw = (root / source['path']).read_bytes()
        require(digest(raw) == source['sha256'], f'{key}: source bytes changed')
        if 'sourceBytesSha256' in source:
            original = gzip.decompress(raw) if source['path'].endswith('.gz') else raw
            require(digest(original) == source['sourceBytesSha256'], f'{key}: original source bytes changed')

    character_bytes = (root / 'public/data/characters.json').read_bytes()
    rows = json.loads(character_bytes)['characters']
    multi = {row[0]: row for row in rows if len([part for part in row[1].split('/') if part.strip()]) > 1}
    require(set(multi) == set(review['entries']), 'multi-reading inventory changed; audit every added/removed record')
    source = manifest['sources']['cc-cedict']
    cedict = gzip.decompress((root / source['path']).read_bytes()).decode('utf-8')
    evidence = {glyph: [] for glyph in multi}
    for line in cedict.splitlines():
        if not line or line.startswith('#'):
            continue
        for glyph in dict.fromkeys(line.split(' ', 2)[:2]):
            if glyph in evidence:
                evidence[glyph].append(line)

    raw = (root / CATALOG).read_bytes()
    catalog = json.loads(raw)
    revisions = list(catalog.get('readingRevisions', []))
    records, cases = {}, []
    for glyph, row in multi.items():
        item = review['entries'][glyph]
        require(row == item['recorded'], f'{glyph}: exact imported tuple changed; re-review required')
        readings = [part.strip() for part in row[1].split('/')]
        revision = item.get('readingRevision')
        if revision:
            require(revision['glyph'] == glyph and revision['recordedRow'] == row and revision['previous'] == row[1],
                    f'{glyph}: reading revision is not bound to the exact original row')
            require(item.get('references') and item.get('note'), f'{glyph}: reading revision requires sources and disclosure')
            readings = [part.strip() for part in revision['reading'].split('/')]
            for reading, recording in revision.get('readingAudio', {}).items():
                require(reading in readings and recording in catalog['audio'] and
                        any(bindings.get(reading) == recording for bindings in catalog['readingAudio'].values()),
                        f'{glyph}: revised audio lacks an existing exact-reading binding')
            prior = [r for r in revisions if r['glyph'] == glyph]
            require(not prior or prior == [revision], f'{glyph}: existing revision differs from the reviewed choice')
            if not prior:
                revisions.append(revision)
        status = item['status']
        require(status in ('existing', 'shared', 'distinct', 'unresolved'), f'{glyph}: unknown review status')
        case = {'glyph': glyph, 'id': f'Characters:{glyph}', 'recorded': row, 'status': status,
                'note': item.get('note', item.get('zdic', '')), 'ccCedictEntries': evidence[glyph],
                'references': item.get('references', [])}
        if revision:
            case['readingRevision'] = revision
        if status == 'unresolved':
            require(item.get('note') and item.get('references') and 'readings' not in item,
                    f'{glyph}: unresolved cases need a reason/sources and cannot assign meanings')
            cases.append(case)
            continue
        if status == 'existing':
            record = item['record']
        else:
            require(set(item['readings']) == set(readings), f'{glyph}: exact reading keys differ')
            require(all(value.strip() for value in item['readings'].values()), f'{glyph}: empty assigned meaning')
            shared = len(set(item['readings'].values())) == 1
            require(shared == (status == 'shared'), f'{glyph}: shared/distinct classification differs')
            # Exact dictionary headword entries and explicit alternative-pronunciation notes
            # can attest a reading. Neither spelling similarity nor traditional substitution
            # supplies evidence; exceptional historical senses have their reviewed references.
            if not item.get('zdic') and not item.get('references'):
                for reading in readings:
                    number = re.escape(numbered(reading))
                    pattern = rf'^\S+ \S+ \[{number}\]|(?:Taiwan pr\.|also pr\.) \[{number}\]'
                    require(any(re.search(pattern, line, re.I) for line in evidence[glyph]),
                            f'{glyph} {reading}: no exact reading or explicit alternate-pronunciation evidence')
            if item.get('zdic'):
                require(glyph in manifest['sources'], f'{glyph}: missing preserved dictionary page')
                case['references'].append({'label': 'Han Dian dictionary', 'url': manifest['sources'][glyph]['url']})
            links = [{'label': 'CC-CEDICT entry', 'url': 'https://www.mdbg.net/chinese/dictionary?page=worddict&wdqb=' + quote(glyph)}]
            links += case['references']
            links.append({'label': 'CC BY-SA 4.0', 'url': source['licenseUrl']})
            record = {
                'readings': {reading: item['readings'][reading] for reading in readings},
                'combined': row[2],
                'source': 'CC-CEDICT (MDBG), 24 November 2026 release; adapted English glosses under CC BY-SA 4.0.'
                          + (' Han Dian basic, detailed and Guoyu dictionary entries also consulted.' if item.get('zdic') else '')
                          + (' Additional historical evidence is linked below.' if item.get('references') else ''),
                'sourceUrl': links[0]['url'], 'sourceLinks': links, 'date': review['date'],
                'approvedBy': 'project-owner-requested editorial audit',
                **({'note': item.get('note', item.get('zdic'))} if item.get('note') or item.get('zdic') else {}),
            }
        require(record['combined'] == row[2] and set(record['readings']) == set(readings), f'{glyph}: stale reviewed record')
        records[glyph] = record
        case['readings'] = record['readings']
        case['source'] = record['source']
        case['references'] = record.get('sourceLinks', [{'label': 'Dictionary source', 'url': record['sourceUrl']}])
        cases.append(case)

    # Replace only the reviewed metadata objects: on-disk source rows, IDs, geometry,
    # etymology, original recordings and unrelated metadata retain their exact bytes.
    compact = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    old = compact(catalog.get('readingMeanings', {}))
    require(raw.count(old) == 1, 'catalogue format changed; cannot safely replace only readingMeanings')
    updated = raw.replace(old, compact(records), 1)
    old_revisions = compact(catalog.get('readingRevisions', []))
    require(updated.count(old_revisions) == 1, 'cannot safely replace reading revision metadata')
    updated = updated.replace(old_revisions, compact(revisions), 1)
    counts = Counter(case['status'] for case in cases)
    report = {'schemaVersion': 1, 'date': review['date'], 'scope': review['scope'], 'policy': review['policy'],
              'charactersSha256': digest(character_bytes), 'reviewSha256': digest(review_bytes),
              'sources': manifest['sources'], 'counts': {'total': len(cases), 'covered': len(records), **dict(counts)},
              'cases': cases}
    lines = ['# Character reading and meaning audit', '', f"Audit date: {review['date']}.", '',
             review['scope'], '', review['policy'], '',
             f"{len(cases)} records scanned; {len(records)} have source-backed reading meanings: "
             f"{counts['existing']} existing, {counts['distinct']} new distinct/overlapping senses, "
             f"{counts['shared']} new shared-meaning alternate pronunciations. "
             f"{counts['unresolved']} remain unresolved and retain their original display.", '',
             '## Source and presentation boundaries', '',
             '- CC-CEDICT supplies dictionary entries that already bind pinyin to English senses; English glosses are edited/adapted under CC BY-SA 4.0.',
             '- Han Dian entries and explicit historical references supplement rare or regional readings; original downloaded bytes and SHA-256 hashes are preserved under the importer source guide.',
             '- A recorded reading can be regional, archaic or compound-bound; it need not have a unique meaning. Identical meanings share a line with one speaker per reading.',
             '- Original on-disk readings, meanings, row IDs/order, historical-source text, etymology notes, script associations, audio and stroke data remain unchanged.',
             '- Explicit pronunciation choices are stored in readingRevisions, applied only to an exact matching original tuple at hydration, and disclosed with the original reading in the source popup. Their audio can use only an existing exact-reading attachment.',
             '- Definitions do not establish etymology. Existing historical/decomposition cards retain their own sources and identities.',
             '- This audit covers readings explicitly present in the catalogue, not every pronunciation found in external dictionaries.', '',
             '## Cases requiring exact-reading evidence', '']
    for case in cases:
        if case['status'] == 'unresolved':
            lines += [f"- **{case['glyph']} ({case['recorded'][1]})**: {case['note']}",
                      '  Sources: ' + ', '.join(f"[{ref['label']}]({ref['url']})" for ref in case['references']) + '.']
    lines += ['', '## Explicit pronunciation choices', '']
    for case in cases:
        if case.get('readingRevision'):
            revision = case['readingRevision']
            lines.append(f"- **{case['glyph']}**: original `{revision['previous']}` retained; card uses `{revision['reading']}`. {case['note']}")
    lines += ['', '## Complete inventory', '', '| Character | Recorded readings | Outcome | Display meanings |', '| --- | --- | --- | --- |']
    for case in cases:
        meanings = ' / '.join(f"{reading}: {meaning}" for reading, meaning in case.get('readings', {}).items()) or 'Original combined display retained; see unresolved notes.'
        lines.append(f"| {case['glyph']} | {case['recorded'][1]} | {case['status']} | {meanings.replace('|', '/')} |")
    lines += ['', 'Machine-readable evidence: [audit JSON](character-reading-meanings-audit.json).',
              'Preserved inputs, license and checks: [source guide](../importer/data/character-readings/README.md).',
              'Regenerate with `python scripts/import-reading-meanings.py --write`; verify with `--check`.', '']
    return {CATALOG: updated, AUDIT: (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'),
            REPORT: '\n'.join(lines).encode('utf-8')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for path, expected in build().items():
        destination = ROOT / path
        if args.write:
            destination.write_bytes(expected)
            print(f'wrote {path}')
        else:
            require(destination.exists() and destination.read_bytes() == expected, f'{path}: stale generated output')
            print(f'checked {path}')


if __name__ == '__main__':
    main()
