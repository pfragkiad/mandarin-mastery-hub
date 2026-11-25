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

    def test_teaching_selection_keeps_exact_targets_and_review_evidence(self):
        originals = module.review.keyed(module.review.read_tsv(ROOT / 'reports/tatoeba-translation-review.tsv'))
        self.assertEqual(len(self.rows), 1028)
        self.assertTrue({row['character'] for row in self.rows.values()} <= {row['character'] for row in originals.values()})
        for record_id, row in self.rows.items():
            self.assertEqual(record_id, 'Characters:' + row['character'])
            self.assertIn(row['character'], row['sentence'])
            original = originals[row['selection']['reviewEvidenceId']]
            self.assertEqual(row['source']['chinese']['text'], original['sentence'])
            self.assertEqual(row['source']['english']['text'], original['translation'])
            for name, text in [('originalChinese', original['sentence']), ('originalEnglish', original['translation']),
                               ('displayChinese', row['sentence']), ('displayEnglish', row['translation'])]:
                self.assertEqual(row['binding'][name + 'Sha256'], module.review.sha(text))

    def test_unresolved_and_long_candidates_stay_offline(self):
        counts = self.data['counts']
        self.assertEqual(counts['latestReviewStatus'], {'Pass': 1028})
        self.assertEqual(counts['warningTriangles'], 0)
        self.assertEqual(counts['unfilledCharacters'], 196)
        self.assertEqual(counts['maximumDisplayedHanzi'], 20)
        audit = json.loads(self.outputs[module.AUDIT])
        zhou = next(row for row in audit['heldCandidates'] if row['character'] == chr(0x5dde))
        self.assertEqual(zhou['reviewStatus'], 'Needs_Fix')
        self.assertIsNone(zhou['replacementId'])
        self.assertNotIn('Characters:' + chr(0x5dde), self.rows)
        for row in self.rows.values():
            self.assertEqual(module.exclusion_reasons(row), [])
            self.assertEqual(row['display']['marker'], 'source_info')
            self.assertFalse(row['review']['pinyinVerified'])
            self.assertFalse(row['review']['targetCharacterSenseVerified'])
            if not row['review']['round3'] and 'excerpt' not in row['editorial']:
                self.assertEqual(row['sentence'], row['source']['chinese']['text'])
                self.assertEqual(row['translation'], row['source']['english']['text'])

    def test_reviewed_pairs_share_corrections_without_inventing_returned_ids(self):
        self.assertEqual(self.data['counts']['round3ReturnedIds'], 75)
        self.assertEqual(self.data['counts']['round3ReviewedPairAssignments'], 107)
        pairs = {}
        for row in self.rows.values():
            if row['review']['latestRound'] != 3:
                continue
            pair = (row['binding']['chineseSentenceId'], row['binding']['englishSentenceId'])
            text = (row['sentence'], row['translation'])
            self.assertEqual(pairs.setdefault(pair, text), text)
            self.assertEqual(row['review']['round3ReturnedForThisId'], row['id'] in row['review']['round3EvidenceIds'])

    def test_changed_chinese_never_inherits_original_pinyin_or_recordings(self):
        self.assertEqual(self.data['counts']['chineseEditedAssignments'], 15)
        for row in self.rows.values():
            self.assertIsNone(row['audio'])
            if row['editorial']['chineseChanged']:
                self.assertIsNone(row['pinyin'])
                self.assertTrue(row['editorial']['pinyinWithheldAfterChineseEdit'])
        self.assertEqual(self.data['counts']['sourceRecordingsWithoutLicense'], 85)

    def test_checked_excerpts_are_exact_parent_spans_not_automatic_crops(self):
        definitions = json.loads(module.EXCERPTS.read_bytes())['excerpts']
        rows = [row for row in self.rows.values() if 'excerpt' in row['editorial']]
        self.assertEqual(len(rows), 14)
        for row in rows:
            excerpt = row['editorial']['excerpt']
            for lang in ('chinese', 'english'):
                span = excerpt['spans'][lang]
                parent = row['source'][lang]['text']
                self.assertEqual(parent[span['start']:span['end']], span['text'])
                self.assertEqual(module.review.sha(parent), excerpt['parent' + lang.title() + 'Sha256'])
            self.assertIn(':excerpt:', row['id'])
            self.assertFalse(row['review']['round3ReturnedForThisId'])
        row = next(row for row in rows if row['editorial']['excerpt']['id'] == definitions[0]['id'])
        parent = {**row, 'id': row['selection']['reviewEvidenceId'], 'sentence': row['source']['chinese']['text'],
                  'translation': row['source']['english']['text']}
        with self.assertRaises(ValueError):
            module.checked_excerpts({'test': parent}, [{**definitions[0], 'english': 'invented words'}])
        with self.assertRaises(ValueError):
            module.checked_excerpts({'test': {**parent, 'review': {**parent['review'], 'status': 'Needs_Fix'}}}, [definitions[0]])

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
