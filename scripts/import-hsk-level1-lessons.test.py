"""Canonical package identity and v3.2 semantic validation boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('lesson_import', Path(__file__).with_name('import-hsk-level1-lessons.py'))
lesson_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lesson_import)


class LessonPackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = lesson_import.LESSONS / 'hsk3/level1/TOPIC_LESSON_SHOPPING_AND_THINGS/TOPIC_LESSON_SHOPPING_AND_THINGS.json'
        cls.lesson = json.loads(path.read_bytes())

    def test_current_import_is_a_no_op_and_matches_all_600_examples(self):
        _, report = lesson_import.audit(lesson_import.DEFAULT_SOURCE)
        self.assertEqual(report['wordCardExamples'], 600)
        self.assertEqual(report['outputFilesChanged'], [])

    def test_all_19_core_project_sources_retain_the_exact_supplied_bytes(self):
        source = lesson_import.ROOT / 'importer/data/lessons/Mandarin_Core_Project_Sources_v3.2.0_taxonomy-v2.0.0.zip'
        with zipfile.ZipFile(source) as package:
            self.assertEqual(len(package.namelist()), 19)
            for name in package.namelist():
                self.assertEqual((lesson_import.CORE / name).read_bytes(), package.read(name), name)

    def test_unrelated_subtopic_fails_semantic_validation(self):
        lesson = copy.deepcopy(self.lesson)
        lesson['classification']['subtopic_ids'] = ['digital-technology']
        with self.assertRaisesRegex(ValueError, 'unrelated subtopic'):
            lesson_import.validation.checks_lesson(lesson)

    def test_the_teaching_plan_is_still_required_for_v32(self):
        lesson = copy.deepcopy(self.lesson)
        del lesson['sections']['teaching_plan']
        with self.assertRaisesRegex(ValueError, 'teaching_plan'):
            lesson_import.validation.checks_lesson(lesson)

    def test_v32_generator_retains_the_teaching_path_instead_of_word_card_examples(self):
        spec = importlib.util.spec_from_file_location('lesson_generator', lesson_import.CORE / 'generate_lesson.py')
        generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        _, markdown = generator.render_lesson(self.lesson)
        plan = self.lesson['sections']['teaching_plan']
        self.assertIn(plan['dialogue']['turns'][0]['hanzi'], markdown)
        self.assertIn(plan['common_pitfall'], markdown)


if __name__ == '__main__':
    unittest.main()
