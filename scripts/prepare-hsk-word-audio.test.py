"""Package boundaries: deduplicate clips, preserve rows, verify actual archive bytes, fail closed."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('prepare_audio', Path(__file__).with_name('prepare-hsk-word-audio.py'))
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class AudioPackageTests(unittest.TestCase):
    def fixture(self, directory):
        audio = prepare.audio
        root = Path(directory)
        metadata = root / 'metadata'
        metadata.mkdir()
        for name in ['cmn-caen-tan-index.xml.bz2', 'cmn-caen-tan-readme.txt']:
            (metadata / name).write_bytes((audio.INPUT / name).read_bytes())
        handoff = root / 'hsk5.json'
        handoff.write_text(json.dumps({'entries': [
            {'id': 2001, 'headword': '爱', 'pinyin': 'ài'},
            {'id': 2002, 'headword': '爱', 'pinyin': 'ài'},
        ]}), 'utf-8')
        entries = [{'id': f'exact-{i}', 'hsk_index': i, 'hskLevel': 5, 'simplified': '爱', 'pinyinDisplay': 'ài'}
                   for i in [2001, 2002]]
        clip = b'checksum-verified-test-clip'
        blob = audio.git_blob(clip)
        tree = {'truncated': False, 'tree': [{'path': '64k/hsk/cmn-爱.mp3', 'type': 'blob', 'sha': blob, 'size': len(clip)}]}
        index = {'爱': [{'reading': 'ài', 'file': 'source-identity.mp3'}]}
        return root, metadata, handoff, entries, clip, blob, tree, index

    def run_preparation(self, directory, corrupt=False):
        audio = prepare.audio
        root, metadata, handoff, entries, clip, blob, tree, index = self.fixture(directory)
        output = root / 'hsk-level-5-audio.zip'

        def fetch(url):
            return json.dumps(tree).encode() if 'git/trees/' in url else b'incorrect' if corrupt else clip

        with patch.multiple(audio, INPUT=metadata, HANDOFF=handoff, MANIFEST=metadata / 'level5-manifest.json', LEVEL=5, SIZE=2), \
                patch.object(audio.base, 'source_index', return_value=index), \
                patch.object(audio.base.vocabulary_store, 'read_vocabulary', return_value={'entries': entries}), \
                patch.object(prepare, 'fetch', side_effect=fetch):
            report = prepare.prepare(root / 'recordings', output)
        return report, output, blob, clip

    def test_duplicate_forms_keep_two_identity_rows_and_one_verified_clip(self):
        with tempfile.TemporaryDirectory(prefix='hsk-audio-package-') as directory:
            report, output, blob, clip = self.run_preparation(directory)
            self.assertEqual((report['entries'], report['counts']['matched'], report['uniqueClips']), (2, 2, 1))
            with zipfile.ZipFile(output) as package:
                manifest = json.loads(package.read('level5-manifest.json'))
                self.assertEqual([row['entryId'] for row in manifest['entries']], ['exact-2001', 'exact-2002'])
                self.assertEqual(package.read(f'recordings/{blob}.mp3'), clip)
                self.assertEqual(len([name for name in package.namelist() if name.endswith('.mp3')]), 1)
                self.assertEqual(manifest['entries'][0]['recording']['sha256'], prepare.audio.sha256(clip))

    def test_corrupt_download_never_creates_a_package(self):
        with tempfile.TemporaryDirectory(prefix='hsk-audio-package-') as directory:
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                self.run_preparation(directory, corrupt=True)
            self.assertFalse((Path(directory) / 'hsk-level-5-audio.zip').exists())

    def test_rejects_media_destinations_inside_the_repository(self):
        with self.assertRaisesRegex(ValueError, 'outside the repository'):
            prepare.external(prepare.audio.ROOT / 'recordings')

    def test_level6_prepares_from_handoff_when_not_yet_in_vocabulary(self):
        with tempfile.TemporaryDirectory(prefix='hsk-audio-package-l6-') as directory:
            audio = prepare.audio
            root, metadata, handoff, _, clip, blob, tree, index = self.fixture(directory)
            output = root / 'hsk-level-6-audio.zip'

            def fetch(url):
                return json.dumps(tree).encode() if 'git/trees/' in url else clip

            with patch.multiple(audio, INPUT=metadata, HANDOFF=handoff, MANIFEST=metadata / 'level6-manifest.json', LEVEL=6, SIZE=2), \
                    patch.object(audio.base, 'source_index', return_value=index), \
                    patch.object(audio.base.vocabulary_store, 'read_vocabulary', return_value={'entries': []}), \
                    patch.object(prepare, 'fetch', side_effect=fetch):
                report = prepare.prepare(root / 'recordings', output)

            self.assertEqual((report['level'], report['entries'], report['counts']['matched'], report['uniqueClips']), (6, 2, 2, 1))
            self.assertIn('Level 6', report['state'])
            with zipfile.ZipFile(output) as package:
                manifest = json.loads(package.read('level6-manifest.json'))
                self.assertEqual([row['entryId'] for row in manifest['entries']],
                                 [prepare.handoff_entry_id(2001, 6), prepare.handoff_entry_id(2002, 6)])


if __name__ == '__main__':
    unittest.main()
