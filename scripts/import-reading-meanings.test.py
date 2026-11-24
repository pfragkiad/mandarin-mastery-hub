"""Regression checks for source bindings and complete, fail-closed audit generation."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('reading_importer', Path(__file__).with_name('import-reading-meanings.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReadingAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outputs = module.build()
        cls.report = json.loads(cls.outputs[module.AUDIT])
        cls.catalog = json.loads(cls.outputs[module.CATALOG])

    def test_all_multi_reading_tuples_have_explicit_dispositions(self):
        self.assertEqual(self.report['counts'], {'total': 75, 'covered': 72, 'existing': 5, 'distinct': 39, 'unresolved': 3, 'shared': 28})
        self.assertEqual({case['glyph'] for case in self.report['cases'] if case['status'] == 'unresolved'}, {'伲', '剖', '崾'})
        for glyph in ('伲', '剖', '崾'):
            self.assertNotIn(glyph, self.catalog['readingMeanings'])

    def test_original_catalogue_fields_and_reviewed_splits_stay_intact(self):
        original = json.loads((module.ROOT / module.CATALOG).read_bytes())
        self.assertEqual({k: v for k, v in original.items() if k != 'readingMeanings'},
                         {k: v for k, v in self.catalog.items() if k != 'readingMeanings'})
        review = json.loads((module.ROOT / module.INPUT / 'review.json').read_bytes())
        for glyph, item in review['entries'].items():
            if item['status'] == 'existing':
                self.assertEqual(self.catalog['readingMeanings'][glyph], item['record'])

    def test_every_new_split_is_source_attached(self):
        for case in self.report['cases']:
            if case['status'] not in ('shared', 'distinct'):
                continue
            record = self.catalog['readingMeanings'][case['glyph']]
            self.assertIn('CC-CEDICT', record['source'])
            self.assertTrue(any(link['label'] == 'CC BY-SA 4.0' for link in record['sourceLinks']))
            self.assertEqual(set(record['readings']), set(case['recorded'][1].split(' / ')))
            self.assertTrue(case['ccCedictEntries'] or case['references'])

    def test_changed_source_bytes_fail_before_generation(self):
        real_read = Path.read_bytes
        source_path = module.ROOT / module.INPUT / 'cedict_1_0_ts_utf-8_mdbg.txt.gz'

        def changed(path):
            raw = real_read(path)
            return raw + b'changed' if path == source_path else raw

        with patch.object(Path, 'read_bytes', changed):
            with self.assertRaisesRegex(ValueError, 'source bytes changed'):
                module.build()

    def test_changed_inventory_or_record_requires_review(self):
        real_read = Path.read_bytes
        source_path = module.ROOT / 'public/data/characters.json'
        data = json.loads(real_read(source_path))
        next(row for row in data['characters'] if row[0] == '都')[1] = 'dōu / dū / dǔ'

        def changed(path):
            return json.dumps(data).encode('utf-8') if path == source_path else real_read(path)

        with patch.object(Path, 'read_bytes', changed):
            with self.assertRaisesRegex(ValueError, 'exact imported tuple changed'):
                module.build()


if __name__ == '__main__':
    unittest.main()
