"""Audio import boundaries: exact readings, CDN provenance, and no unrelated mutations."""
import copy
import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('hsk_audio', Path(__file__).with_name('import-hsk-level2-audio.py'))
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class AudioImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = audio.load_manifest()
        cls.vocabulary = audio.vocabulary_store.read_vocabulary()

    def test_exact_source_coverage_and_duplicate_form_readings(self):
        _, report = audio.import_audio(self.vocabulary, self.manifest)
        self.assertEqual((report['matched'], report['reading_mismatch'], report['missing']), (166, 13, 21))
        by_index = {row['hskIndex']: row for row in self.manifest['entries']}
        self.assertEqual(by_index[347]['status'], 'matched')  # 过 guò
        self.assertEqual(by_index[351]['status'], 'reading_mismatch')  # 过 guo
        self.assertEqual(by_index[357]['recording'], by_index[358]['recording'])  # 花 huā
        self.assertEqual(by_index[314]['status'], 'reading_mismatch')  # 长 cháng vs source zhǎng

    def test_reading_match_never_removes_tones_or_borrows_neutral_readings(self):
        self.assertEqual(audio.reading(' Bù hǎoyìsi '), audio.reading('bùhǎoyìsi'))
        self.assertNotEqual(audio.reading('guo'), audio.reading('guò'))
        self.assertNotEqual(audio.reading('shēngrì'), audio.reading('shēngri'))

    def test_existing_exact_word_clip_can_be_reused_without_touching_other_fields(self):
        before = copy.deepcopy(self.vocabulary)
        # Clear later levels too: their entries now carry reusable Level 2 clips, and this
        # fixture models the state before any Level 2 upload (only Level 1 reusable).
        for entry in before['entries']:
            if entry['hskLevel'] is not None and entry['hskLevel'] >= 2:
                entry['audio'] = None
        data, report = audio.import_audio(before, self.manifest)
        self.assertEqual(report['attached'], 1)
        self.assertEqual(len(report['pendingUpload']), 165)
        changed = [entry for entry, old in zip(data['entries'], before['entries']) if entry != old]
        self.assertEqual([entry['hsk_index'] for entry in changed], [336])  # 点 diǎn
        for entry, old in zip(data['entries'], before['entries']):
            self.assertEqual({k: v for k, v in entry.items() if k not in ['audio', 'updatedAt']},
                             {k: v for k, v in old.items() if k not in ['audio', 'updatedAt']})
        self.assertEqual(data['categories'], before['categories'])
        again, next_report = audio.import_audio(data, self.manifest)
        self.assertEqual(data, again)
        self.assertEqual(next_report['changed'], 0)

    def test_upload_pointer_requires_the_same_project_bytes_media_type_and_cdn(self):
        recording = next(row['recording'] for row in self.manifest['entries'] if row['status'] == 'matched')
        pointer = {'project_id': audio.PROJECT, 'size': recording['bytes'], 'content_type': 'audio/mpeg',
                   'url': '/__l5e/assets-v1/12345678-1234-1234-1234-123456789abc/clip.mp3'}
        self.assertEqual(audio.uploaded_audio(pointer, recording)['source'], audio.SOURCE)
        for key, value in [('project_id', 'another-project'), ('size', recording['bytes'] + 1),
                           ('content_type', 'text/html'), ('url', 'https://raw.githubusercontent.com/audio.mp3')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                audio.uploaded_audio({**pointer, key: value}, recording)

    def test_changed_entry_reading_and_forged_source_match_are_rejected(self):
        changed = copy.deepcopy(self.vocabulary)
        next(entry for entry in changed['entries'] if entry['hsk_index'] == 302)['pinyinDisplay'] = 'àihāo'
        with self.assertRaisesRegex(ValueError, 'Changed Level 2 identity/reading'):
            audio.import_audio(changed, self.manifest)
        manifest = copy.deepcopy(self.manifest)
        next(row for row in manifest['entries'] if row['hskIndex'] == 351)['status'] = 'matched'
        with self.assertRaisesRegex(ValueError, 'one exact source reading'):
            audio.import_audio(self.vocabulary, manifest)

    def test_available_upload_is_attached_only_to_its_exact_entry(self):
        import json
        row = next(row for row in self.manifest['entries'] if row['hskIndex'] == 302)
        pointer = {'project_id': audio.PROJECT, 'size': row['recording']['bytes'], 'content_type': 'audio/mpeg',
                   'url': '/__l5e/assets-v1/12345678-1234-1234-1234-123456789abc/clip.mp3'}
        # Start from unattached Level 2 records so the check stays meaningful after
        # the real CDN attachments have been written to the vocabulary.
        before = copy.deepcopy(self.vocabulary)
        for entry in before['entries']:
            if entry['hskLevel'] == 2:
                entry['audio'] = None
        with tempfile.TemporaryDirectory(prefix='mandarin-audio-test-') as directory:
            uploads = Path(directory)
            (uploads / (row['recording']['gitBlob'] + '.json')).write_text(json.dumps(pointer), 'utf-8')
            data, report = audio.import_audio(before, self.manifest, uploads)
            self.assertEqual(next(entry for entry in data['entries'] if entry['hsk_index'] == 302)['audio']['url'], pointer['url'])
            self.assertNotIn(302, report['pendingUpload'])
            self.assertEqual([entry for entry in data['entries'] if entry['hskLevel'] != 2],
                             [entry for entry in before['entries'] if entry['hskLevel'] != 2])

    def test_committed_attachments_cover_exactly_the_eligible_entries(self):
        _, report = audio.import_audio(self.vocabulary, self.manifest)
        self.assertEqual((report['attached'], report['changed'], report['pendingUpload']), (166, 0, []))
        attached = {entry['hsk_index'] for entry in self.vocabulary['entries'] if entry['hskLevel'] == 2 and entry.get('audio')}
        for hsk_index in (301, 314, 332, 333, 351, 352, 356, 419, 426, 430, 447, 459, 472, 303, 496):
            row = next(row for row in self.manifest['entries'] if row.get('previousHskIndex', row['hskIndex']) == hsk_index)
            self.assertNotIn(row['hskIndex'], attached)


if __name__ == '__main__':
    unittest.main()
