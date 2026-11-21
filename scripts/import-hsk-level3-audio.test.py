"""Level 3 audio import boundaries: exact readings, package checksums, CDN provenance only."""
import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('hsk3_audio', Path(__file__).with_name('import-hsk-level3-audio.py'))
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class Level3AudioImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = audio.load_manifest()
        cls.vocabulary = audio.read(audio.VOCABULARY)
        cls.by_index = {row['hskIndex']: row for row in cls.manifest['entries']}

    def test_package_coverage_is_443_exact_matches(self):
        _, report = audio.import_audio(self.vocabulary, self.manifest)
        self.assertEqual((report['matched'], report['missing'], report['reading_mismatch']), (443, 45, 12))

    def test_different_tones_and_neutral_patterns_stay_unmatched(self):
        # Source records these with a different tone or neutral syllable.
        for hsk_index in (532, 539, 559, 570, 583, 654, 678, 730, 737, 902, 933, 992):
            self.assertEqual(self.by_index[hsk_index]['status'], 'reading_mismatch', hsk_index)
        self.assertEqual(self.by_index[583]['sourceCandidates'][0]['reading'], 'děi')  # 得 dé
        self.assertEqual(self.by_index[992]['sourceCandidates'][0]['reading'], 'zǐ')  # 子 zi

    def test_earlier_level_clips_are_reused_only_for_the_same_word_and_reading(self):
        fresh = copy.deepcopy(self.vocabulary)
        for entry in fresh['entries']:
            if entry['hskLevel'] == 3:
                entry['audio'] = None
        data, report = audio.import_audio(fresh, self.manifest)
        self.assertEqual(report['reusedExisting'], 3)
        reused = sorted(entry['hsk_index'] for entry in data['entries'] if entry['hskLevel'] == 3 and entry.get('audio'))
        self.assertEqual(reused, [660, 683, 966])  # 过去 guòqù, 会 huì, 站 zhàn
        self.assertEqual(len(report['pendingUpload']), 440)

    def test_only_audio_and_timestamp_change_and_only_on_level_3(self):
        fresh = copy.deepcopy(self.vocabulary)
        for entry in fresh['entries']:
            if entry['hskLevel'] == 3:
                entry['audio'] = None
        row = self.by_index[501]
        pointer = {'project_id': audio.base.PROJECT, 'size': row['recording']['bytes'], 'content_type': 'audio/mpeg',
                   'url': '/__l5e/assets-v1/00000000-0000-0000-0000-000000000000/hsk3-test.mp3'}
        with tempfile.TemporaryDirectory(prefix='mandarin-audio3-test-') as directory:
            uploads = Path(directory)
            (uploads / (row['recording']['gitBlob'] + '.json')).write_text(json.dumps(pointer), 'utf-8')
            data, _ = audio.import_audio(fresh, self.manifest, uploads)
        for entry, old in zip(data['entries'], fresh['entries']):
            self.assertEqual({k: v for k, v in entry.items() if k not in ['audio', 'updatedAt']},
                             {k: v for k, v in old.items() if k not in ['audio', 'updatedAt']})
            if entry['hskLevel'] != 3:
                self.assertEqual(entry, old)
        self.assertEqual(next(e for e in data['entries'] if e['hsk_index'] == 501)['audio']['url'], pointer['url'])

    def test_committed_attachments_cover_exactly_the_matched_entries(self):
        _, report = audio.import_audio(self.vocabulary, self.manifest)
        self.assertEqual(report['pendingUpload'], [])
        self.assertEqual((report['attached'], report['changed']), (443, 0))
        attached = {e['hsk_index'] for e in self.vocabulary['entries'] if e['hskLevel'] == 3 and e.get('audio')}
        unmatched = {row['hskIndex'] for row in self.manifest['entries'] if row['status'] != 'matched'}
        self.assertEqual(len(attached), 443)
        self.assertFalse(attached & unmatched)

    def test_committed_upload_map_attaches_every_matched_entry_from_a_clean_level(self):
        fresh = copy.deepcopy(self.vocabulary)
        for entry in fresh['entries']:
            if entry['hskLevel'] == 3:
                entry['audio'] = None
        data, report = audio.import_audio(fresh, self.manifest, audio.INPUT / 'level3-uploads.json')
        self.assertEqual((report['attached'], report['reusedExisting'], report['pendingUpload']), (443, 3, []))
        self.assertEqual(sum(1 for e in data['entries'] if e['hskLevel'] == 3 and e.get('audio')), 443)


if __name__ == '__main__':
    unittest.main()
