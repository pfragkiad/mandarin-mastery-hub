"""English publication boundaries: completeness, Unicode and exact Chinese identity."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


helper = load('translation_batches', 'shuowen-translation-batches.py')
importer = load('translation_importer', 'import-etymology.py')


class TranslationBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        # Real duplicate-headword entries; neither may borrow the other's English.
        entries = importer.source_entries(cls.manifest)
        cls.original = {'舌': [entry for entry in entries['舌'] if entry['sourceId'] == 'shuowen']}
        cls.metadata = json.loads((helper.BASE / 'source-batches/001.json').read_text(encoding='utf-8'))['dataset_metadata']

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.sources = root / 'sources'
        self.base = self.sources / 'translations'
        (self.base / 'source-batches').mkdir(parents=True)
        self.entries = copy.deepcopy(self.original)
        self.source = {'format': 'mandarin-shuowen-translation-source-batch', 'schemaVersion': 1,
                       'batch': '001', 'dataset_metadata': copy.deepcopy(self.metadata),
                       'records': [{'id': entry['id'], 'headword': entry['headword'], 'text': entry['text'],
                                    'sourceTextSha256': helper.sha(entry['text'].encode('utf-8'))}
                                   for entry in self.entries['舌']]}
        self.source_path = self.base / 'source-batches/001.json'
        self.source_path.write_bytes(helper.encode(self.source))
        for module, key, value in [(helper, 'BASE', self.base), (importer, 'ROOT', root), (importer, 'SOURCES', self.sources)]:
            mock = patch.object(module, key, value)
            mock.start()
            self.addCleanup(mock.stop)
        self.drafts = {'shuowen:941': 'First test draft, with 舌 preserved.',
                       'shuowen:1437': 'Second independent test draft, with 口 preserved.'}
        helper.save_batch(1, self.drafts, ('shuowen:1437',))
        self.path = self.base / 'en/001.json'

    def rewrite(self, change):
        payload = json.loads(self.path.read_text(encoding='utf-8'))
        change(payload)
        self.path.write_bytes(helper.encode(payload))

    def attach(self):
        return importer.attach_shuowen_translations(self.entries, self.manifest)

    def test_duplicate_headwords_have_independent_drafts_and_originals(self):
        inputs, summary = self.attach()
        self.assertEqual(summary['record_count'], 2)
        self.assertEqual(summary['uncertain_record_count'], 1)
        self.assertEqual(len(inputs), 2)
        for original, actual in zip(self.original['舌'], self.entries['舌']):
            self.assertEqual({key: value for key, value in actual.items() if key != 'translation'}, original)
            self.assertEqual(actual['translation']['text'], self.drafts[original['id']])
            self.assertEqual(actual['translation']['reviewStatus'], 'unreviewed-ai-draft')

    def test_changed_source_text_cannot_keep_translation(self):
        self.entries['舌'][0]['text'] += '。'
        with self.assertRaisesRegex(ValueError, 'changed Chinese text'):
            self.attach()

    def test_changed_source_batch_cannot_keep_translation(self):
        self.source_path.write_bytes(self.source_path.read_bytes() + b'\n')
        with self.assertRaisesRegex(ValueError, 'Unbound'):
            self.attach()

    def test_partial_collection_is_rejected(self):
        self.path.unlink()
        with self.assertRaisesRegex(ValueError, 'incomplete: 0/2'):
            self.attach()

    def test_missing_or_foreign_record_in_batch_is_rejected(self):
        self.rewrite(lambda data: data['translations'].pop('shuowen:941'))
        with self.assertRaisesRegex(ValueError, 'Incomplete translation batch'):
            self.attach()

    def test_unsupported_review_claim_and_changed_notice_are_rejected(self):
        self.rewrite(lambda data: data['dataset_metadata'].update(review_status='verified'))
        with self.assertRaisesRegex(ValueError, 'incorrectly labeled'):
            self.attach()
        helper.save_batch(1, self.drafts)
        self.rewrite(lambda data: data['dataset_metadata'].update(license_notices=[]))
        with self.assertRaisesRegex(ValueError, 'provenance or license'):
            self.attach()

    def test_encoding_substitutions_rejected_but_english_question_is_allowed(self):
        bad = {**self.drafts, 'shuowen:941': 'Formed from ? and ?.'}
        with self.assertRaisesRegex(ValueError, 'encoding loss'):
            helper.save_batch(1, bad)
        self.rewrite(lambda data: data['translations']['shuowen:941'].update(text='Formed from ? and ?.'))
        with self.assertRaisesRegex(ValueError, 'encoding loss'):
            self.attach()
        helper.save_batch(1, {**self.drafts, 'shuowen:941': 'How is it formed? From 舌.'})
        self.attach()


if __name__ == '__main__':
    unittest.main()
