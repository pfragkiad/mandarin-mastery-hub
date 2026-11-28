#!/usr/bin/env python3
"""Prepare the official 7-9 vocabulary seed and a version-bound Level 6 audit.

Normal builds use only the standard library and frozen PDF text snapshots.
--extract requires pypdf 6.21.4 and reproduces those snapshots from preserved PDFs.
No English, classification, example language or runtime identities are inferred.
"""
import argparse
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('importer/data/hsk-level7')
OUTPUT = Path('importer/hsk/hsk3_level7_0.0.1.json')
TRANSCRIPTION = INPUT / 'official-vocabulary.json'
AUDIT = Path('reports/hsk-level7-0.0.1-official-source-audit.json')
REPORT = Path('reports/hsk-level7-0.0.1-official-source-audit.md')
CROSSWALK = Path('reports/hsk-level6-official-numbering-crosswalk.tsv')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def array_bytes(rows):
    return ('[\n' + ',\n'.join(json.dumps(row, ensure_ascii=False, separators=(',', ':'))
                              for row in rows) + '\n]\n').encode('utf-8')


def verify_file(record):
    raw = (ROOT / INPUT / record['path']).read_bytes()
    assert len(raw) == record['bytes'], record['path']
    assert sha(raw) == record['sha256'], record['path']
    return raw


def parse_pages(pages):
    """Read fixed layout columns, retaining blank POS and annotated level labels.

    Pinyin's internal single spaces are source text. Two or more spaces delimit
    the PDF columns; removing all spaces would silently alter source readings.
    """
    rows = []
    for page in pages:
        for line in page['text'].splitlines():
            columns = re.split(r'\s{2,}', line.strip())
            if len(columns) < 2 or not columns[0].isdigit():
                continue
            if not re.fullmatch(r'(?:[1-6]|7-9)(?:（[0-9-]+）)*', columns[1]):
                continue
            assert len(columns) in (4, 5), (page['pdf_page'], line)
            serial, label, word, pinyin = columns[:4]
            suffix = re.fullmatch(r'(.+?)(\d+)', word)
            rows.append({
                'id': int(serial), 'level': label.split('（')[0],
                'level_label': label, 'entry': word,
                'hanzi': suffix[1] if suffix else word,
                'homograph': int(suffix[2]) if suffix else None,
                'pinyin': pinyin, 'part_of_speech': columns[4] if len(columns) == 5 else '',
                'source_pdf_page': page['pdf_page'],
            })
    return rows


def build():
    manifest_raw = (ROOT / INPUT / 'source-manifest.json').read_bytes()
    manifest = json.loads(manifest_raw)
    assert manifest['schema_version'] == 'hsk-official-source-manifest/0.0.1'
    for record in (manifest['official_page'], manifest['current_pdf'], manifest['previous_pdf']):
        verify_file(record)
    html = verify_file(manifest['official_page']).decode('utf-8')
    # Bind official-site discovery to the actual PDF URL, not a search mirror.
    assert manifest['current_pdf']['url'] in html
    current = json.loads(verify_file(manifest['extractions']['current']))
    previous = json.loads(verify_file(manifest['extractions']['previous_level6']))
    assert [page['pdf_page'] for page in current] == list(range(1, 407))
    assert [page['pdf_page'] for page in previous] == list(range(94, 139))
    rows = parse_pages(current)
    assert [row['id'] for row in rows] == list(range(1, 11001))
    counts = dict(Counter(row['level'] for row in rows))
    assert counts == {'1': 300, '2': 200, '3': 500, '4': 1000, '5': 1600, '6': 1800, '7-9': 5600}
    prior_level6 = parse_pages(previous)
    assert [row['id'] for row in prior_level6] == list(range(3601, 5401))

    level6_raw = (ROOT / manifest['existing_level6']['path']).read_bytes()
    assert sha(level6_raw) == manifest['existing_level6']['sha256']
    level6 = json.loads(level6_raw)['entries']
    for stored, official in zip(level6, prior_level6):
        assert (stored['id'], stored['syllabus_headword'], stored['pinyin'], stored['syllabus_pos_zh']) == (
            official['id'], official['entry'], official['pinyin'], official['part_of_speech'])

    # A headword alone is not an identity: 卷, 散 and 吐 each have two readings.
    # Compare all 1,800 exact headword/reading/POS tuples as a multiset first.
    key = lambda row: (row['entry'], row['pinyin'], row['part_of_speech'])
    current_level6 = [row for row in rows if row['level'] == '6']
    assert Counter(map(key, current_level6)) == Counter(map(key, prior_level6))
    assert len({key(row) for row in current_level6}) == 1800
    current_by_key = {key(row): row for row in current_level6}
    mapping = []
    for old in prior_level6:
        new = current_by_key[key(old)]
        mapping.append({'headword': old['entry'], 'pinyin': old['pinyin'],
                        'pos_zh': old['part_of_speech'], 'previous_official_id': old['id'],
                        'current_official_id': new['id'], 'previous_pdf_page': old['source_pdf_page'],
                        'current_pdf_page': new['source_pdf_page'],
                        'status': 'unchanged' if old['id'] == new['id'] else 'renumbered'})
    changed = sum(row['status'] == 'renumbered' for row in mapping)
    assert changed == 850

    advanced = [row for row in rows if row['level'] == '7-9']
    assert [row['id'] for row in advanced] == list(range(5401, 11001))
    entries = [{
        'id': row['id'], 'official_level_label': row['level_label'],
        'headword': row['hanzi'], 'pinyin': row['pinyin'],
        'syllabus_headword': row['entry'], 'syllabus_pos_zh': row['part_of_speech'],
        'homograph': row['homograph'], 'source_pdf_page': row['source_pdf_page'],
        'meaning_en': None, 'examples': [], 'classification_status': 'pending',
    } for row in advanced]
    metadata = {
        'schema_version': 'hsk-official-vocabulary-seed/0.0.1', 'data_version': '0.0.1',
        'syllabus': {
            'name': 'HSK 3.0 examination syllabus', 'edition': manifest['edition'],
            'level': None, 'levels': [7, 8, 9], 'official_level_label': '7-9',
            'entry_count': 5600, 'id_range': [5401, 11000], 'cumulative_entry_count': 11000,
            'scope': 'Complete official shared Levels 7-9 word list; not a separate official Level 7 subset.',
            'filename_note': 'The Level 7 filename is the owner-requested local working name for the combined advanced band.',
        },
        'verification': {
            'status': 'official_pdf_word_list_seed_enrichment_pending', 'import_ready': False,
            'retrieved_on': manifest['retrieved_on'],
            'official_page': manifest['official_page']['url'],
            'official_pdf': {'url': manifest['current_pdf']['url'], 'sha256': manifest['current_pdf']['sha256'],
                             'pdf_pages': [215, 354]},
            'source_manifest': {'path': '../data/hsk-level7/source-manifest.json', 'sha256': sha(manifest_raw)},
            'extraction': manifest['extractor'],
            'coverage': 'All 5,600 printed rows retained in official serial order, including homographs and 443 blank POS cells.',
            'pending': ['English meanings', 'Topic and subtopic assignments', 'Application entry kinds',
                        'Conversational and written examples', 'Language review', 'Recordings'],
            'identity_policy': 'Keep official 7-9 labels and exact version-bound serials. No fabricated separate Level 7 allocation; no changes to existing vocabulary UUIDs or syllabus identities.',
            'level6_comparison': {'headword_reading_pos_tuples_match': 1800,
                                  'existing_release_matches_previous_official_pdf': True,
                                  'current_pdf_serials_changed': changed,
                                  'crosswalk': '../../reports/hsk-level6-official-numbering-crosswalk.tsv'},
        },
        'taxonomy_reference': {'path': 'hsk3_topics.json',
                               'sha256': sha((ROOT / 'importer/hsk/hsk3_topics.json').read_bytes()),
                               'assignment_status': 'pending'},
    }
    # One complete entry on each line; remain a normal JSON object with an array.
    header = json.dumps(metadata, ensure_ascii=False, indent=2)
    output = (header[:-2] + ',\n  "entries": ' + array_bytes(entries).decode().rstrip() + '\n}\n').encode('utf-8')
    assert json.loads(output)['entries'] == entries
    assert len(output) < 9_000_000

    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=list(mapping[0]), delimiter='\t', lineterminator='\n')
    writer.writeheader()
    writer.writerows(mapping)
    summary = {
        'current_official_vocabulary_rows': 11000, 'level_counts': counts,
        'advanced_entries': len(advanced), 'advanced_id_range': [5401, 11000],
        'advanced_pdf_pages': [215, 354], 'advanced_blank_pos': sum(not row['part_of_speech'] for row in advanced),
        'advanced_unique_written_forms': len({row['hanzi'] for row in advanced}),
        'level6_existing_release_matches_previous_official_pdf': True,
        'level6_headword_reading_pos_tuples_match_current_pdf': 1800,
        'level6_changed_official_serials': changed, 'level6_unchanged_official_serials': 1800 - changed,
        'runtime_data_changed': False, 'examples_written': 0,
    }
    audit = {
        'schema_version': 'hsk-official-source-audit/0.0.1',
        'source_manifest': {'path': (INPUT / 'source-manifest.json').as_posix(), 'sha256': sha(manifest_raw)},
        'current_official_pdf': manifest['current_pdf'], 'previous_official_pdf': manifest['previous_pdf'],
        'summary': summary, 'output': {'path': OUTPUT.as_posix(), 'bytes': len(output), 'sha256': sha(output),
                                     'format': 'one compact entry per line', 'split_needed': False},
        'level6_numbering_crosswalk': CROSSWALK.as_posix(),
        'numbering_change_examples': [row for row in mapping if row['status'] == 'renumbered'][:10],
    }
    report = f'''# Official HSK advanced vocabulary: 0.0.1 source audit

The [official HSK site]({manifest['official_page']['url']}) links directly to
[this syllabus PDF]({manifest['current_pdf']['url']}). Its cover identifies the
November 2025 edition, effective July 2026. The vocabulary table gives a shared
**Levels 7–9** band, with **5,600 entries, serials 5401–11000**, on PDF pages
215–354. It does not allocate these rows separately to Level 7, Level 8 or Level 9.

The [requested seed](../{OUTPUT.as_posix()}) preserves every advanced row, reading,
raw POS value, homograph suffix and PDF page. Its filename retains the owner's
Level 7 working name, while its metadata explicitly identifies the shared band.
There are 443 blank official POS cells and 5,585 distinct written forms; repeated
forms remain separate records. English meanings, classifications and examples
are pending. The seed uses a distinct schema and is not ready for the runtime importer.

## Level 6 comparison

The existing [Level 6 release](../importer/hsk/hsk3_level6_1.0.0.json) matches
**all 1,800 ID/headword/reading/POS tuples** in the
[earlier official PDF it cited]({manifest['previous_pdf']['url']}) exactly.
The PDF currently linked by the official website also contains the **same 1,800
headword/reading/POS tuples**, but **850 serial numbers differ** because the
ordering changed. The remaining 950 serials match. Matching uses the full tuple
and retains the separate pronunciation entries for 卷, 散 and 吐.

For example, the earlier PDF numbers 案例 as 3602 and 按摩 as 3603; the current
PDF numbers 按摩 as 3602 and 案例 as 3603. These are numbering changes, not added,
removed or differently pronounced Level 6 words. The
[complete 1,800-row crosswalk](hsk-level6-official-numbering-crosswalk.tsv) records
both official IDs and PDF pages. No application record IDs, words, examples or
recordings are changed. Reconciliation of the existing official-number display
is a separate data migration; do not overwrite UUIDs or HSK indices implicitly.

## Evidence and checks

Both exact PDF downloads, the official download-page snapshot and their extracted
text are preserved under [the input directory](../importer/data/hsk-level7/README.md).
The [manifest](../importer/data/hsk-level7/source-manifest.json) records byte lengths,
SHA-256 checksums, URLs and extraction details. The two PDFs are different files
carrying the same printed edition; `1219` in the current filename alone is not
treated as a new syllabus edition. PDF pages 170 and 215 were rendered and checked
for column boundaries, Level 6 order and the shared 7–9 label.

All 11,000 current official serials were parsed in order without gaps or merges.
Counts are 300 / 200 / 500 / 1,000 / 1,600 / 1,800 / 5,600 for Levels 1–6 and 7–9.
The [machine audit](hsk-level7-0.0.1-official-source-audit.json) records the checks
and output checksum. The seed is {len(output):,} bytes and needs no split at this
source-only stage; its entries each occupy one line.

```sh
python scripts/prepare-hsk-level7.py --write
python scripts/prepare-hsk-level7.py --check
```
'''
    return {TRANSCRIPTION: array_bytes(rows), OUTPUT: output, CROSSWALK: stream.getvalue().encode('utf-8'),
            AUDIT: encoded(audit), REPORT: report.encode('utf-8')}


def extract():
    import pypdf
    assert pypdf.__version__ == '6.21.4', 'Install pypdf==6.21.4 to reproduce the frozen text'
    manifest = json.loads((ROOT / INPUT / 'source-manifest.json').read_bytes())
    for label in ('current', 'previous_level6'):
        record = manifest['extractions'][label]
        pdf = manifest[record['source_pdf']]
        verify_file(pdf)
        reader = pypdf.PdfReader(ROOT / INPUT / pdf['path'])
        first, last = record['pdf_pages']
        pages = [{'pdf_page': i + 1, 'text': reader.pages[i].extract_text(extraction_mode='layout')}
                 for i in range(first - 1, last)]
        raw = encoded(pages)
        assert sha(raw) == record['sha256'], 'Extraction differs from frozen snapshot; do not overwrite it'
        (ROOT / INPUT / record['path']).write_bytes(raw)
        print(f'Reproduced {record["path"]}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--extract', action='store_true')
    options = parser.parse_args()
    if options.extract:
        extract()
        return
    for relative, raw in build().items():
        assert len(raw) < 9_000_000, relative
        path = ROOT / relative
        if options.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        else:
            assert path.read_bytes() == raw, f'Generated output differs: {relative}'
    print(('Wrote' if options.write else 'Checked') + ' 5,600 official 7-9 entries; Level 6 words/readings/POS exact, 850 serials renumbered.')


if __name__ == '__main__':
    main()
