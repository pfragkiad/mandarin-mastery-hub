"""Keep exported lesson HTML/Markdown HSK labels equal to authoritative JSON.

Only numeric labels are changed; wording, layout and all source ZIPs stay exact.
"""
import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / 'src/data/study_lessons/lessons'


def normalize_companion(text, suffix, items, context):
    """Replace only numeric labels, preserving source words and byte layout."""
    items = [it for it in items if it.get('syllabus_refs')]
    ids = [it['syllabus_refs'][0]['entry_id'] for it in items]
    if not ids:
        return text
    patterns = ([r'(data-syllabus-entry-id=")(\d+)(")', r'(HSK #)(\d+)()'] if suffix == '.html'
                else [r'(\[HSK entry )(\d+)(\])'])
    if suffix == '.html' and 'data-syllabus-entry-id=' not in text:
        patterns = [r'(HSK entry )(\d+)()']
    for pattern in patterns:
        matches = list(re.finditer(pattern, text))
        assert len(matches) == len(ids), (context, 'label count differs from JSON', len(matches), len(ids))
        if suffix == '.md':
            for match, item in zip(matches, items):
                line = text[text.rfind('\n', 0, match.start()) + 1:match.end()]
                assert item['hanzi'] in line, (context, 'word order differs', item['hanzi'])
        values = iter(ids)
        text = re.sub(pattern, lambda m: m[1] + str(next(values)) + m[3], text)
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    checked, changed = 0, []
    for path in sorted(LESSONS.rglob('*_LESSON_*/*.json')):
        if 'legacy' in path.relative_to(LESSONS).parts:
            continue
        doc = json.loads(path.read_bytes())
        items = doc.get('sections', {}).get('vocabulary', {}).get('items', [])
        items = [it for it in items if it.get('syllabus_refs')]
        ids = [it['syllabus_refs'][0]['entry_id'] for it in items]
        if not ids:
            continue
        for suffix in ('.html', '.md'):
            companion = path.with_suffix(suffix)
            raw = companion.read_bytes()
            text = raw.decode('utf-8')
            original = text
            text = normalize_companion(text, suffix, items, companion)
            checked += 1
            if text != original:
                changed.append(companion.relative_to(ROOT).as_posix())
                if args.write:
                    companion.write_bytes(text.encode('utf-8'))
                else:
                    raise AssertionError(f'Obsolete companion HSK labels: {companion}')
    print(json.dumps({'companions_checked': checked, 'changed_files': changed}, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
