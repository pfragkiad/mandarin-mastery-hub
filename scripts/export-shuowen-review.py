"""Export all source-bound Shuowen drafts as one readable UTF-8 review file."""
import importlib.util
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'reports/shuowen-english-review.txt'
SEPARATOR = '    ||    '


def single_line(text):
    """Retain readable Unicode while escaping literal controls and separators."""
    escaped = text.replace('\\', '\\\\').replace('|', '\\|')
    for original, replacement in [('\r', r'\r'), ('\n', r'\n'), ('\t', r'\t'),
                                  ('\v', r'\v'), ('\f', r'\f'), ('\x85', r'\u0085'),
                                  ('\u2028', r'\u2028'), ('\u2029', r'\u2029')]:
        escaped = escaped.replace(original, replacement)
    return escaped


def main():
    spec = importlib.util.spec_from_file_location('etymology_importer', ROOT / 'scripts/import-etymology.py')
    importer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(importer)
    with redirect_stdout(io.StringIO()):
        importer.load_downloader().check()
    manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
    entries = importer.source_entries(manifest)
    _, summary = importer.attach_shuowen_translations(entries, manifest)
    records = sorted((entry for group in entries.values() for entry in group if entry['sourceId'] == 'shuowen'),
                     key=lambda entry: int(entry['id'].split(':')[1]))
    source = next(item for item in manifest['sources'] if item['id'] == 'shuowen')
    header = ['Shuowen Jiezi - complete English draft review export',
              f'Entries: {len(records)}; uncertain passages: {summary["uncertain_record_count"]}.',
              ('English is AI-generated with partial editorial corrections, not full philological certification.'
               if 'editorial_review' in summary else 'English is AI-generated and unreviewed. Historical source claims are not verified modern etymology.'),
              f'Source: {source["repository"]} @ {source["revision"]}',
              'Format: KEY    ||    CHINESE (headword + original explanation)    ||    ENGLISH DRAFT',
              'Each entry occupies one line, with a blank line between entries. Preserve the exact key when reviewing.',
              '[UNCERTAIN] identifies an existing uncertainty flag; it is not part of the translated text.',
              r'Literal backslashes/pipes and embedded line breaks/tabs are escaped (\\, \|, \n, \r, \t).',
              'Source license: Apache-2.0. Full source copyright/license notices follow the entries.',
              'Where supplied, an EDITORIAL READING comment identifies the separate Chinese basis for the English; the CHINESE field preserves the imported source.']
    notices = ['SOURCE COPYRIGHT AND LICENSE NOTICES']
    for notice in manifest['dataset_metadata']['license_notices']:
        if notice['source_id'] == 'shuowen':
            notices.extend([f'License: {notice["license"]}', f'Source: {notice["source_url"]}',
                            f'Original notice SHA-256: {notice["sha256"]}',
                            notice.get('copyright_notice', ''), notice['notice']])
    lines = []
    for entry in records:
        draft = entry['translation']
        english_label = 'ENGLISH DRAFT [UNCERTAIN]: ' if draft['uncertain'] else 'ENGLISH DRAFT: '
        row = SEPARATOR.join([f'KEY: {entry["id"]}',
            f'CHINESE: {single_line(entry["headword"])} — {single_line(entry["text"])}',
            english_label + single_line(draft['text'])])
        reading = draft.get('editorialReview', {}).get('sourceReading')
        if reading:
            row = (f'# EDITORIAL READING for {entry["id"]}: {single_line(reading["headword"])} — {single_line(reading["text"])}\n'
                   f'# {single_line(reading["classification"])}: {single_line(reading["note"])}\n\n' + row)
        assessment = draft.get('editorialReview', {}).get('caseEvidence')
        if assessment:
            row = (f'# SUPPLIED REVIEW ASSESSMENT for {entry["id"]}: {assessment["decision"]}\n'
                   f'# {single_line(assessment["reviewerNote"])}\n'
                   f'# Evidence URLs: {single_line("; ".join(assessment["sourceUrls"]))}\n\n' + row)
        lines.append(row)
    comments = '\n'.join('# ' + line for item in header for line in item.split('\n'))
    footer = '\n'.join('# ' + line for item in notices for line in item.splitlines())
    OUTPUT.write_bytes((comments + '\n\n' + '\n\n'.join(lines) + '\n\n' + footer + '\n').encode('utf-8'))
    print(f'Exported {len(records)} entries to {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes).')


if __name__ == '__main__':
    main()
