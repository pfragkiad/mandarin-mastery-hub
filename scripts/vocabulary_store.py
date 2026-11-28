"""Read/write the vocabulary as one object while storing it split by HSK level.

src/data/vocabulary/ holds index.json (every top-level key except entries, plus the
ordered `parts` list) and one part per HSK level (level-N.json, or two
level-N-part-*.json files when the compact level reaches 9 MB; unlevelled.json for
entries without a level). Parts are ordered by each level's first appearance; an
optional entryOrder preserves the original order when levels are interleaved.

A path ending in .json is read/written as one combined file (importer test fixtures).

Level parts are written one compact entry per line (dump_entries): diffs stay per entry,
and every part stays under the repository's 10 MB per-file limit, which the indented
layout exceeded once Level 5 arrived. The Node twin writes byte-identical files.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'src/data/vocabulary'
MAX_PART_BYTES = 9_000_000


def part_name(entry):
    level = entry.get('hskLevel')
    return 'unlevelled.json' if level is None else f'level-{level}.json'


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=4) + '\n'


def dump_entries(entries):
    # One compact JSON entry per line; still a plain JSON array for every reader.
    lines = ',\n'.join(json.dumps(entry, ensure_ascii=False, separators=(',', ':')) for entry in entries)
    return '[\n' + lines + '\n]\n' if entries else '[]\n'


def vocabulary_parts(entries):
    """Match the Node writer: split oversized levels into two ordered parts."""
    levels = {}
    for entry in entries:
        levels.setdefault(part_name(entry), []).append(entry)
    parts = {}
    for name, rows in levels.items():
        if len(dump_entries(rows).encode('utf-8')) < MAX_PART_BYTES:
            parts[name] = rows
        else:
            middle = (len(rows) + 1) // 2
            for index, half in enumerate((rows[:middle], rows[middle:]), 1):
                if not half or len(dump_entries(half).encode('utf-8')) >= MAX_PART_BYTES:
                    raise ValueError(f'Vocabulary part exceeds {MAX_PART_BYTES} bytes: {name}')
                parts[f'{name[:-5]}-part-{index}.json'] = half
    return parts


def read_vocabulary(path=DIRECTORY):
    path = Path(path)
    if path.suffix == '.json':
        return json.loads(path.read_text('utf-8'))
    index = json.loads((path / 'index.json').read_text('utf-8'))
    data = {key: value for key, value in index.items() if key not in ('parts', 'entryOrder')}
    data['entries'] = []
    for name in index['parts']:
        data['entries'].extend(json.loads((path / name).read_text('utf-8')))
    if 'entryOrder' in index:
        entries = data['entries']
        by_id = {entry['id']: entry for entry in entries}
        order = index['entryOrder']
        if len(by_id) != len(entries) or len(order) != len(entries) or len(set(order)) != len(entries) or any(entry_id not in by_id for entry_id in order):
            raise ValueError('Invalid vocabulary entry order')
        data['entries'] = [by_id[entry_id] for entry_id in order]
    return data


def write_vocabulary(data, path=DIRECTORY):
    path = Path(path)
    if path.suffix == '.json':
        path.write_bytes(dump(data).encode('utf-8'))
        return
    parts = vocabulary_parts(data['entries'])
    order = [entry['id'] for entry in data['entries']]
    if any(not isinstance(entry_id, str) for entry_id in order) or len(set(order)) != len(order):
        raise ValueError('Vocabulary entries must have unique string IDs')
    grouped = [entry['id'] for entries in parts.values() for entry in entries]
    path.mkdir(parents=True, exist_ok=True)
    for stale in set(p.name for p in path.glob('*.json')) - set(parts) - {'index.json'}:
        (path / stale).unlink()
    for name, entries in parts.items():
        target, content = path / name, dump_entries(entries)
        # Match the Node writer while preserving unchanged checkout line endings.
        if not target.exists() or target.read_text('utf-8') != content:
            target.write_bytes(content.encode('utf-8'))
    index = {key: value for key, value in data.items() if key != 'entries'}
    index['parts'] = list(parts)
    if grouped != order:
        index['entryOrder'] = order
    (path / 'index.json').write_bytes(dump(index).encode('utf-8'))


def read_text(path=DIRECTORY):
    """All stored text (index + parts), for scans such as the font subset builder."""
    path = Path(path)
    if path.suffix == '.json':
        return path.read_text('utf-8')
    return ''.join(p.read_text('utf-8') for p in sorted(path.glob('*.json')))
