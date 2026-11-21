"""Round-trip split vocabulary with interleaved levels."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
import vocabulary_store  # noqa: E402


class VocabularyStoreTests(unittest.TestCase):
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
