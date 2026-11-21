"""Read/write the vocabulary as one object while storing it split by HSK level.

src/data/vocabulary/ holds index.json (every top-level key except entries, plus the
ordered `parts` list) and one part per HSK level (level-N.json, unlevelled.json for
entries without a level). Each part stays well under the repository's per-file size
limit as levels gain recordings. Parts are ordered by each level's first appearance,
so a level's entries stay contiguous and in their original relative order.

A path ending in .json is read/written as one combined file (importer test fixtures).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'src/data/vocabulary'


def part_name(entry):
    level = entry.get('hskLevel')
    return 'unlevelled.json' if level is None else f'level-{level}.json'


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=4) + '\n'


def read_vocabulary(path=DIRECTORY):
    path = Path(path)
    if path.suffix == '.json':
        return json.loads(path.read_text('utf-8'))
    index = json.loads((path / 'index.json').read_text('utf-8'))
    data = {key: value for key, value in index.items() if key != 'parts'}
    data['entries'] = []
    for name in index['parts']:
        data['entries'].extend(json.loads((path / name).read_text('utf-8')))
    return data


def write_vocabulary(data, path=DIRECTORY):
    path = Path(path)
    if path.suffix == '.json':
        path.write_text(dump(data), 'utf-8')
        return
    parts = {}
    for entry in data['entries']:
        parts.setdefault(part_name(entry), []).append(entry)
    path.mkdir(parents=True, exist_ok=True)
    for stale in set(p.name for p in path.glob('*.json')) - set(parts) - {'index.json'}:
        (path / stale).unlink()
    for name, entries in parts.items():
        (path / name).write_text(dump(entries), 'utf-8')
    index = {key: value for key, value in data.items() if key != 'entries'}
    index['parts'] = list(parts)
    (path / 'index.json').write_text(dump(index), 'utf-8')


def read_text(path=DIRECTORY):
    """All stored text (index + parts), for scans such as the font subset builder."""
    path = Path(path)
    if path.suffix == '.json':
        return path.read_text('utf-8')
    return ''.join(p.read_text('utf-8') for p in sorted(path.glob('*.json')))
