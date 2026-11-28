"""The component reference compiler must reject unsupported or stale review data."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('component_refs', Path(__file__).with_name('import-component-form-references.py'))
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)


class ComponentReferenceEvidence(unittest.TestCase):
    def setUp(self):
        self.review = json.loads(compiler.REVIEW.read_text(encoding='utf8'))

    def compile_review(self, review):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'review.json'
            path.write_text(json.dumps(review, ensure_ascii=False), encoding='utf8')
            with patch.object(compiler, 'REVIEW', path):
                return compiler.compile_references()

    def test_current_review_compiles(self):
        self.assertEqual(len(compiler.compile_references()['references']), 4)

    def test_changed_source_tuple_fails(self):
        review = copy.deepcopy(self.review)
        review['references'][0]['recordedRows']['Characters'][1] = 'different reading'
        with self.assertRaises(AssertionError):
            self.compile_review(review)

    def test_changed_dictionary_evidence_fails(self):
        review = copy.deepcopy(self.review)
        review['references'][0]['evidence']['sourceEntry'] += ' invented sense'
        with self.assertRaises(AssertionError):
            self.compile_review(review)

    def test_unrelated_same_reading_target_fails(self):
        review = copy.deepcopy(self.review)
        rows = json.loads((compiler.ROOT / 'public/data/characters.json').read_text(encoding='utf8'))['characters']
        review['references'][0]['targetRow'] = next(row for row in rows if row[0] == '\u90e8')
        with self.assertRaises(AssertionError):
            self.compile_review(review)

    def test_phonetic_relation_cannot_become_lexical_inheritance(self):
        review = copy.deepcopy(self.review)
        review['references'][-1]['meaningMode'] = 'shared'
        with self.assertRaises(AssertionError):
            self.compile_review(review)


if __name__ == '__main__':
    unittest.main()
