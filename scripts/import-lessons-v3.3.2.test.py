"""Source fidelity, progress compatibility, and fail-closed release boundaries."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
spec = importlib.util.spec_from_file_location('lesson_release', Path(__file__).with_name('import-lessons-v3.3.2.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lesson = json.loads((release.LESSONS / 'conversational/CONVERSATIONAL_LESSON_ASKING_DIRECTIONS/'
                                'CONVERSATIONAL_LESSON_ASKING_DIRECTIONS.json').read_bytes())
        cls.course = json.loads((release.LESSONS / 'curricula/CONVERSATIONAL_MANDARIN.json').read_bytes())

    def test_audit_stages_exact_source_bytes_without_writing_runtime_files(self):
        before = {p: release.sha(p.read_bytes()) for p in release.LIB.rglob('*') if p.is_file()}
        writes, report = release.audit()
        self.assertEqual(report['checks']['validatedActiveLessons'], 65)
        self.assertEqual(len(report['lessons']), 19)
        self.assertGreaterEqual(report['checks']['exactHskWordBindingsMatched'], 500)
        self.assertFalse(any('/hsk3/' in p.as_posix() or '/vocabulary/' in p.as_posix() for p in writes))
        with zipfile.ZipFile(release.CORE_PACKAGE) as package:
            self.assertEqual(len(package.namelist()), 20)
            for name in package.namelist():
                self.assertEqual(writes[release.CORE / name], package.read(name))
        with zipfile.ZipFile(release.OTHER_PACKAGE) as package:
            for name in package.namelist():
                if not name.endswith('.zip'):
                    continue
                stem = Path(name).stem
                target = 'independent' if name.startswith('independent/') else 'conversational'
                with zipfile.ZipFile(io.BytesIO(package.read(name))) as lesson:
                    for member in lesson.namelist():
                        self.assertEqual(writes[release.LESSONS / target / stem / member], lesson.read(member))
        self.assertEqual(before, {p: release.sha(p.read_bytes()) for p in release.LIB.rglob('*') if p.is_file()})

    def test_changed_checkpoint_target_is_rejected(self):
        new = copy.deepcopy(self.lesson)
        new['progress']['sections'][0]['checkpoints'][0]['target_id'] = 'other-target'
        with self.assertRaisesRegex(ValueError, 'checkpoint identities changed'):
            release.check_identity(new, self.lesson, 'fixture')

    def test_additive_checkpoints_preserve_original_completion_keys(self):
        new = copy.deepcopy(self.lesson)
        checkpoint = copy.deepcopy(new['progress']['sections'][0]['checkpoints'][0])
        checkpoint['id'] = 'new-source-checkpoint'
        new['progress']['sections'][0]['checkpoints'].append(checkpoint)
        release.check_identity(new, self.lesson, 'fixture')

    def test_removing_an_existing_checkpoint_is_rejected(self):
        new = copy.deepcopy(self.lesson)
        new['progress']['sections'][0]['checkpoints'].pop(0)
        with self.assertRaisesRegex(ValueError, 'checkpoint identities changed'):
            release.check_identity(new, self.lesson, 'fixture')

    def test_changed_existing_placement_is_rejected(self):
        new = copy.deepcopy(self.course)
        new['sections'][0]['units'][0]['placements'][0]['lesson_id'] = 'other-lesson'
        with self.assertRaisesRegex(ValueError, 'placements/identities changed'):
            release.check_curriculum_extension(new, self.course)

    def test_changed_question_id_is_rejected(self):
        new = copy.deepcopy(self.lesson)
        new['sections']['practice']['questions'][0]['id'] = 'new-question'
        with self.assertRaisesRegex(ValueError, 'question IDs/order changed'):
            release.check_identity(new, self.lesson, 'fixture')

    def test_label_edits_preserve_completion_identity(self):
        new = copy.deepcopy(self.lesson)
        new['progress']['sections'][0]['checkpoints'][0]['label'] = 'Updated supplied label'
        release.check_identity(new, self.lesson, 'fixture')

    def test_reordered_or_retargeted_curriculum_is_not_equivalent(self):
        new = copy.deepcopy(self.course)
        new['sections'][0]['units'][0]['placements'][0]['lesson_id'] = 'other-lesson'
        self.assertNotEqual(release.curriculum_identity(new), release.curriculum_identity(self.course))

    def test_zip_path_traversal_is_rejected(self):
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, 'w') as package:
            package.writestr('../outside.json', '{}')
        with self.assertRaisesRegex(ValueError, 'unsafe ZIP member'):
            release.read_zip(raw.getvalue())

    def test_dictionary_reading_mismatch_halts_instead_of_repairing(self):
        node = {'id': 'w-1', 'hanzi': 'test', 'pinyin': 'different', 'meaning_en': 'one',
                'syllabus_refs': [{'curriculum_id': 'hsk3-2025', 'entry_id': 1}]}
        entry = {'hsk_index': 1, 'simplified': 'test', 'pinyinDisplay': 'recorded',
                 'hskSource': {'sourceId': '1'}, 'meanings': ['one']}
        doc = {'lesson_id': 'fixture'}
        with self.assertRaisesRegex(ValueError, 'pinyin/tones differ'):
            release.check_words(doc, [entry], lambda _: [node])
        self.assertEqual(node['pinyin'], 'different')


if __name__ == '__main__':
    unittest.main()
