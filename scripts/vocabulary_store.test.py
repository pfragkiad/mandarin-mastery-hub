"""Round-trip split vocabulary with interleaved levels."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
import vocabulary_store  # noqa: E402


class VocabularyStoreTests(unittest.TestCase):
    def test_oversized_level_splits_by_utf8_bytes_and_cleans_stale_parts(self):
        data = {'categories': [], 'entries': [
            {'id': str(i), 'hskLevel': 6, 'simplified': '\u6c49' * 800_000,
             'audio': {'url': 'https://example.test/clip'}} for i in range(4)
        ]}
        with tempfile.TemporaryDirectory(prefix='vocabulary-store-size-') as directory:
            path = Path(directory)
            vocabulary_store.write_vocabulary(data, path)
            index = json.loads((path / 'index.json').read_text('utf-8'))
            self.assertEqual(index['parts'], ['level-6-part-1.json', 'level-6-part-2.json'])
            for name in index['parts']:
                raw = (path / name).read_bytes()
                self.assertLess(len(raw), 9_000_000)
                self.assertEqual(len(raw.decode('utf-8').strip().splitlines()), 4)
                self.assertNotIn(b'\r\n', raw)
            self.assertEqual(vocabulary_store.read_vocabulary(path), data)
            data['entries'] = [{'id': 'small', 'hskLevel': 6}]
            vocabulary_store.write_vocabulary(data, path)
            self.assertEqual(sorted(p.name for p in path.glob('*.json')), ['index.json', 'level-6.json'])
            self.assertEqual(vocabulary_store.read_vocabulary(path), data)

    def test_interleaved_levels_round_trip_and_invalid_order_fails(self):
        data = {
            'categories': [{'id': 'category'}],
            'entries': [
                {'id': 'a', 'hskLevel': 1, 'audio': {'url': 'https://example.test/a'}},
                {'id': 'b', 'hskLevel': None},
                {'id': 'c', 'hskLevel': 1},
                {'id': 'd', 'hskLevel': 2},
            ],
        }
        with tempfile.TemporaryDirectory(prefix='vocabulary-store-') as directory:
            path = Path(directory)
            vocabulary_store.write_vocabulary(data, path)
            self.assertEqual(vocabulary_store.read_vocabulary(path), data)
            index_path = path / 'index.json'
            index = json.loads(index_path.read_text('utf-8'))
            index['entryOrder'][0] = 'missing'
            index_path.write_text(json.dumps(index), 'utf-8')
            with self.assertRaisesRegex(ValueError, 'Invalid vocabulary entry order'):
                vocabulary_store.read_vocabulary(path)


if __name__ == '__main__':
    unittest.main()
