"""Source/review integrity and stale-reading boundaries of the actual import."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('import_tatoeba', ROOT / 'scripts/import-tatoeba-examples.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TatoebaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data, cls.outputs = module.build()
        cls.rows = cls.data['examples']

    def test_complete_first_candidates_keep_exact_source_identities(self):
        originals = module.review.keyed(module.review.read_tsv(ROOT / 'reports/tatoeba-translation-review.tsv'))
        self.assertEqual(len(self.rows), 1224)
        self.assertEqual({row['id'] for row in self.rows.values()}, set(originals))
        for record_id, row in self.rows.items():
            self.assertEqual(record_id, 'Characters:' + row['character'])
            self.assertIn(row['character'], row['sentence'])
            original = originals[row['id']]
            self.assertEqual(row['source']['chinese']['text'], original['sentence'])
            self.assertEqual(row['source']['english']['text'], original['translation'])
            for name, text in [('originalChinese', original['sentence']), ('originalEnglish', original['translation']),
                               ('displayChinese', row['sentence']), ('displayEnglish', row['translation'])]:
                self.assertEqual(row['binding'][name + 'Sha256'], module.review.sha(text))

    def test_unresolved_findings_remain_warnings_and_reviews_stay_scoped(self):
        counts = self.data['counts']
        self.assertEqual(counts['latestReviewStatus'], {'Pass': 1041, 'Minor_Review': 109, 'Needs_Fix': 74})
        self.assertEqual(counts['warningTriangles'], 183)
        for row in self.rows.values():
            self.assertEqual(row['display']['marker'], 'source_info' if row['review']['status'] == 'Pass' else 'warning_triangle')
            self.assertFalse(row['review']['pinyinVerified'])
            self.assertFalse(row['review']['targetCharacterSenseVerified'])
            if not row['review']['round3']:
                self.assertEqual(row['sentence'], row['source']['chinese']['text'])
                self.assertEqual(row['translation'], row['source']['english']['text'])

    def test_reviewed_pairs_share_corrections_without_inventing_returned_ids(self):
        self.assertEqual(self.data['counts']['round3ReturnedIds'], 94)
        self.assertEqual(self.data['counts']['round3ReviewedPairAssignments'], 142)
        pairs = {}
        for row in self.rows.values():
            if row['review']['latestRound'] != 3:
                continue
            pair = (row['binding']['chineseSentenceId'], row['binding']['englishSentenceId'])
            text = (row['sentence'], row['translation'])
            self.assertEqual(pairs.setdefault(pair, text), text)
            self.assertEqual(row['review']['round3ReturnedForThisId'], row['id'] in row['review']['round3EvidenceIds'])

    def test_changed_chinese_never_inherits_original_pinyin_or_recordings(self):
        self.assertEqual(self.data['counts']['chineseEditedAssignments'], 18)
        for row in self.rows.values():
            self.assertIsNone(row['audio'])
            if row['editorial']['chineseChanged']:
                self.assertIsNone(row['pinyin'])
                self.assertTrue(row['editorial']['pinyinWithheldAfterChineseEdit'])
        self.assertEqual(self.data['counts']['sourceRecordingsWithoutLicense'], 94)

    def test_source_holds_changed_text_and_lost_targets_are_rejected(self):
        original = {'id': 'test', 'character': 'x', 'sentence': 'x source', 'translation': 'source'}
        source = {'id': 1, 'language': 'cmn', 'text': original['sentence'], 'url': 'source', 'contributor': 'author',
                  'license': 'CC BY 2.0 FR', 'marking': {'eligibleForSecondaryReview': True, 'okTag': True, 'positiveReviews': 1},
                  'transcriptions': [], 'audio': []}
        translation = {**source, 'language': 'eng', 'text': original['translation'], 'marking': {'holds': []}}
        review = {'overall_status': 'Pass', 'review_notes': '', **{key: '' for key in module.review.REVIEW_FIELDS}}
        review['overall_status'] = 'Pass'
        for changed in [{**source, 'text': 'changed'}, {**source, 'marking': {**source['marking'], 'eligibleForSecondaryReview': False}}]:
            with self.assertRaises(ValueError):
                module.import_example(original, changed, translation, review, None, None)
        with self.assertRaises(ValueError):
            module.import_example(original, source, translation, review, None,
                                  {'round3_suggested_sentence': 'lost target', 'round3_suggested_translation': 'source',
                                   'round3_status': 'Pass', 'round3_notes': ''})

    def test_reproducible_outputs_and_all_input_hashes(self):
        for path, content in self.outputs.items():
            self.assertEqual(path.read_text('utf-8'), content)
        audit = json.loads(self.outputs[module.AUDIT])
        for binding in audit['inputs']:
            self.assertEqual(hashlib.sha256((ROOT / binding['file']).read_bytes()).hexdigest(), binding['sha256'])
        index = json.loads(self.outputs[module.INDEX])['records']
        self.assertEqual(set(self.rows) | {'Characters:' + chr(value) for value in (0x5218, 0x6717, 0x82f1, 0x9648)}, set(index))


if __name__ == '__main__':
    unittest.main()
