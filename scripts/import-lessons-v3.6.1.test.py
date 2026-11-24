"""Current handoff fidelity and the v3.4 topic validation boundaries."""
import copy
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('import-lessons-v3.6.1.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = release.LESSONS / 'hsk3/level1/TOPIC_LESSON_ABILITIES_INTERESTS/TOPIC_LESSON_ABILITIES_INTERESTS.json'
        cls.doc = release.json.loads(path.read_bytes())
        spec = importlib.util.spec_from_file_location('v', release.CORE / 'validate_core.py')
        cls.validator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.validator)
        cls.catalog = release.json.loads((release.ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']

    def test_source_fidelity_and_audit_has_no_runtime_writes(self):
        before = {p: release.h.sha(p.read_bytes()) for p in release.CORE.parent.rglob('*') if p.is_file()}
        writes, report = release.audit()
        self.assertEqual(report['checks']['activeLessonsValidated'], 65)
        self.assertEqual(report['checks']['exactHskWordBindingsMatched'], 574)
        self.assertEqual(sum(report['checks']['patternsBySection'].values()), 146)
        for key, (name, _) in release.PACKAGES.items():
            package = release.h.read_zip((release.SOURCES / name).read_bytes())
            if key == 'core':
                for member, raw in package.items():
                    self.assertEqual(writes[release.CORE / member], raw)
            for pkg, prefix, target, _ in release.PLACES:
                if pkg != key:
                    continue
                for member, raw in package.items():
                    if member.startswith(prefix) and member.endswith('.zip'):
                        directory = release.LESSONS / target / Path(member).stem
                        for filename, content in release.h.read_zip(raw).items():
                            self.assertEqual(writes[directory / filename], content)
        self.assertEqual(before, {p: release.h.sha(p.read_bytes()) for p in release.CORE.parent.rglob('*') if p.is_file()})

    def test_missing_catalog_reference_still_fails(self):
        doc = copy.deepcopy(self.doc)
        del doc['catalog_character_refs']['主']
        with self.assertRaisesRegex(ValueError, 'missing catalog character references'):
            self.validator.checks_lesson(doc, self.catalog)

    def test_missing_new_pattern_field_fails(self):
        doc = copy.deepcopy(self.doc)
        del doc['sections']['teaching_plan']['patterns'][0]['pattern_pseudo_translation']
        with self.assertRaisesRegex(ValueError, 'pattern_pseudo_translation'):
            self.validator.checks_lesson(doc, self.catalog)

    def test_legacy_formula_is_rejected_in_new_topic_format(self):
        doc = copy.deepcopy(self.doc)
        doc['sections']['teaching_plan']['patterns'][0]['formula_en'] = 'Unexpected legacy field'
        with self.assertRaises(ValueError):
            self.validator.checks_lesson(doc, self.catalog)

    def test_changed_checkpoint_target_fails(self):
        doc = copy.deepcopy(self.doc)
        doc['progress']['sections'][0]['checkpoints'][0]['target_id'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'checkpoint identities changed'):
            release.check_identity(doc, self.doc)

    def test_topic_semantic_guard_applies_to_new_format(self):
        doc = copy.deepcopy(self.doc)
        doc['sections']['teaching_plan']['review']['entry_ids'] = [999999]
        with self.assertRaisesRegex(ValueError, 'review.entry_ids'):
            self.validator.checks_lesson(doc, self.catalog)


if __name__ == '__main__':
    unittest.main()
