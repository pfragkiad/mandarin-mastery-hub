"""Import unofficial practice phrases without changing existing vocabulary records."""
import argparse
import json
import unicodedata
import uuid
from collections import Counter
from pathlib import Path

import openpyxl

SOURCE_NAME = 'Curated Level 1 practice phrases (unofficial)'
SOURCE_VERSION = 'User-provided 2026-10-16'


def import_phrases(workbook_path, vocabulary_path):
    workbook = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    rows = list(workbook['Phrases - ID Order'].values)[1:]
    assert len(rows) == 240, 'Expected 240 phrases'
    assert len({row[0] for row in rows}) == 240, 'Duplicate internal IDs'
    assert len({row[2] for row in rows}) == 240, 'Duplicate phrases'
    assert set(Counter(row[1] for row in rows).values()) == {20}, 'Expected 20 phrases per topic'
    data = json.loads(vocabulary_path.read_text())
    namespace = uuid.NAMESPACE_URL
    identity = lambda key: str(uuid.uuid5(namespace, f'mandarin-tutor:unofficial-hsk1:{key}'))
    existing = {entry['id']: entry for entry in data['entries']}
    categories = {category['id']: category for category in data['categories']}
    for internal_id, topic, chinese, pinyin, english, entry_type, matches, review_notes, status in rows:
        category_id = identity(f'topic:{topic}')
        if category_id not in categories:
            category = {'id': category_id, 'name': f'{topic} · L1 practice phrases'}
            data['categories'].append(category)
            categories[category_id] = category
        tokens = [{'kind': 'punctuation' if unicodedata.category(char).startswith('P') else 'space' if char.isspace() else 'hanzi',
                   'text': char, 'pinyin': None, 'reviewed': False} for char in chinese]
        entry = {
            'id': identity(internal_id), 'sourceId': None, 'sourceName': SOURCE_NAME, 'sourceVersion': SOURCE_VERSION,
            'secondarySources': [{'sourceName': workbook_path.name, 'sourceVersion': SOURCE_VERSION, 'sourceId': internal_id}],
            'simplified': chinese, 'traditional': None, 'tokens': tokens, 'pinyinDisplay': pinyin, 'meanings': [english],
            'entryKind': 'phrase', 'hskLevel': 1, 'hskVersion': '3.0', 'hsk_index': None, 'hskSource': None,
            'categoryId': category_id, 'partOfSpeech': entry_type, 'contentStatus': 'draft', 'audio': None, 'examples': [],
            'phraseMetadata': {'internalId': internal_id, 'syllabusStatus': status, 'entryType': entry_type,
                               'matchedVocabularyIds': [int(value.strip()) for value in str(matches or '').split(',') if value.strip()],
                               'reviewNotes': review_notes},
            'createdAt': '2026-10-16T00:00:00Z', 'updatedAt': '2026-10-16T00:00:00Z',
        }
        previous = existing.get(entry['id'])
        if previous:
            index = data['entries'].index(previous)
            data['entries'][index] = entry
        else:
            data['entries'].append(entry)
        existing[entry['id']] = entry
    vocabulary_path.write_text(json.dumps(data, ensure_ascii=False) + '\n')
    print(f'Imported {len(rows)} unofficial phrases; {len(data["entries"])} total entries.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--output', type=Path, default=Path('src/data/vocabulary.json'))
    arguments = parser.parse_args()
    import_phrases(arguments.workbook, arguments.output)