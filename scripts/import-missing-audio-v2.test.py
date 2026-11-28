"""Protect the round-two identity, explicit-sandhi and no-replacement boundaries."""
import copy
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('v2', Path(__file__).with_name('import-missing-audio-v2.py'))
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)


class RoundTwoTests(unittest.TestCase):
    def setUp(self):
        self.manifest = v2.base.read(v2.MANIFEST)
        self.review = v2.base.read(v2.REVIEW)
        self.data = v2.base.vocabulary_store.read_vocabulary()

    def test_bu_before_fourth_tone_only(self):
        self.assertTrue(v2.sandhi_matches('不见', 'bùjiàn', 'bújiàn'))
        self.assertFalse(v2.sandhi_matches('不同', 'bùtóng', 'bútóng'))

    def test_yi_changes_only_its_initial_tone(self):
        self.assertTrue(v2.sandhi_matches('一边', 'yībiān', 'yìbiān'))
        self.assertTrue(v2.sandhi_matches('一旦', 'yīdàn', 'yídàn'))
        self.assertFalse(v2.sandhi_matches('一边', 'yībiān', 'yìbian'))

    def test_neutral_readings_cannot_be_approved(self):
        self.assertFalse(v2.sandhi_matches('精神', 'jīngshén', 'jīngshen'))
        self.assertFalse(v2.sandhi_matches('后面', 'hòumian', 'hòumiàn'))

    def test_selected_records_and_all_clip_evidence_are_source_bound(self):
        self.assertEqual(len(v2.selections(self.data, self.manifest, self.review)), 25)
        self.assertEqual(len(self.review['transcripts']), 79)
        self.assertEqual(self.review['characters'], [])

    def test_changed_review_hash_is_rejected(self):
        self.review['sourceManifestSha256'] = 'changed'
        with self.assertRaisesRegex(ValueError, 'bind'):
            v2.selections(self.data, self.manifest, self.review)

    def test_transcript_disagreement_is_not_approved(self):
        self.review['words'][0]['transcript'] = 'other'
        with self.assertRaisesRegex(ValueError, 'transcription'):
            v2.selections(self.data, self.manifest, self.review)

    def test_runtime_changes_only_selected_audio_and_is_idempotent(self):
        uploads = v2.base.read(v2.UPLOADS)
        changed, result = v2.import_data(self.data, self.manifest, self.review, uploads)
        self.assertEqual(result['pendingUploads'], [])
        self.assertEqual(result['wordsChanged'], 0)
        self.assertEqual(changed, self.data)
        selected = {r['entryId'] for r in self.review['words']}
        fresh = copy.deepcopy(self.data)
        for row in fresh['entries']:
            if row['id'] in selected:
                row['audio'] = None
        restored, result = v2.import_data(fresh, self.manifest, self.review, uploads)
        self.assertEqual(result['wordsChanged'], 25)
        self.assertEqual(restored, self.data)

    def test_preexisting_recording_is_never_replaced(self):
        self.data['entries'][next(i for i, r in enumerate(self.data['entries']) if r['id'] == self.review['words'][0]['entryId'])]['audio'] = {'url': 'existing'}
        with self.assertRaisesRegex(ValueError, 'replace'):
            v2.import_data(self.data, self.manifest, self.review, v2.base.read(v2.UPLOADS))

    def test_every_clip_and_unresolved_candidate_remains_accounted_for(self):
        data, result = v2.import_data(self.data, self.manifest, self.review, v2.base.read(v2.UPLOADS))
        report = v2.make_report(data, self.manifest, self.review, result)
        self.assertEqual(report['packageCoverage'], {'uniqueClips': 79, 'attachedClips': 25, 'heldOrAlternativeClips': 54})
        self.assertEqual(len(report['wordCandidatesHeld']), 40)
        self.assertEqual(len(report['characterCandidatesHeld']), 3)
        self.assertEqual(report['uncoveredWords'], 831)
        self.assertEqual(report['uncoveredCharacterSlots'], 27)
        held = {row['entryId'] for row in report['wordCandidatesHeld']}
        self.assertTrue(all(row['audio'] is None for row in data['entries'] if row['id'] in held))


if __name__ == '__main__':
    unittest.main()