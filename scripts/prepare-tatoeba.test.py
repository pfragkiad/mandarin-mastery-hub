"""Boundary checks for source-mark filtering, evidence dates and exact identities."""
import importlib.util
import csv
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('tatoeba', ROOT / 'scripts/prepare-tatoeba.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MarkingTests(unittest.TestCase):
    def sentence(self, modified=None):
        return {'modifiedAt': modified}

    def review(self, rating=1, modified='2026-11-20 00:00:00'):
        return {'rating': rating, 'modifiedAt': modified}

    def test_absence_of_negative_marks_is_not_a_positive_review(self):
        mark = module.marking(self.sentence(), [], [], [])
        self.assertFalse(mark['positiveMarked'])
        self.assertFalse(mark['eligibleForSecondaryReview'])

    def test_ok_tag_and_positive_review_are_separate_evidence(self):
        ok = module.marking(self.sentence(), ['OK'], [], [])
        positive = module.marking(self.sentence(), [], [self.review()], [])
        self.assertTrue(ok['okTag'])
        self.assertEqual(ok['positiveReviews'], 0)
        self.assertFalse(positive['okTag'])
        self.assertTrue(positive['eligibleForSecondaryReview'])

    def test_archaic_native_check_and_corrections_override_positive_marks(self):
        for tag in ['archaic', 'Archaic', '@needs native check', 'needs native speaker check', '@change', 'unnatural']:
            with self.subTest(tag=tag):
                mark = module.marking(self.sentence(), ['OK', tag], [self.review()], [])
                self.assertFalse(mark['eligibleForSecondaryReview'])
                self.assertIn(tag, mark['excludedTags'])

    def test_conflicting_negative_review_is_held(self):
        mark = module.marking(self.sentence(), ['OK'], [self.review(), self.review(-1)], [])
        self.assertIn('negative_user_review', mark['holds'])
        self.assertFalse(mark['eligibleForSecondaryReview'])

    def test_old_evidence_is_held_but_newer_positive_review_resolves_date_hold(self):
        sentence = self.sentence('2026-11-21 00:00:00')
        old = module.marking(sentence, ['OK'], [self.review()], [{'tag': 'OK', 'createdAt': '2020-01-01 00:00:00'}])
        self.assertIn('all_positive_marks_predate_text_edit', old['holds'])
        current = module.marking(sentence, [], [self.review(modified='2026-11-22 00:00:00')], [])
        self.assertTrue(current['eligibleForSecondaryReview'])

    def test_unreviewed_transcription_or_unknown_date_is_not_synthesized(self):
        self.assertIsNone(module.null('\\N'))
        self.assertIsNone(module.null('0000-00-00 00:00:00'))
        with self.assertRaises(ValueError):
            module.details([['1', 'yue', 'text', 'owner', '', '']], 'cmn')

    def test_audio_without_a_license_is_not_reusable(self):
        self.assertEqual(module.audio_reuse(''), 'not_permitted_without_separate_permission')
        self.assertEqual(module.audio_reuse('CC BY-NC 4.0'), 'noncommercial_terms_only')

    def test_frontend_marker_distinguishes_pending_review_from_recorded_concerns(self):
        sentence = {'id': 2, 'language': 'cmn', 'text': 'source text', 'contributor': 'owner', 'url': 'https://tatoeba.org/en/sentences/show/2'}
        positive = module.marking(self.sentence(), ['OK'], [], [])
        pending = module.sentence_metadata(sentence, positive)
        self.assertEqual(pending['display']['marker'], 'source_info')
        self.assertFalse(pending['review']['translationVerified'])
        flagged = module.marking(self.sentence(), ['OK', '@wrong transliteration'], [], [])
        metadata = module.sentence_metadata(sentence, flagged)
        self.assertEqual(metadata['display']['marker'], 'warning_triangle')
        self.assertEqual(metadata['review']['concerns'][0]['scope'], 'pinyin')
        self.assertEqual(len(metadata['binding']['textSha256']), 64)

    def test_snapshot_outputs_contain_only_positive_marked_records(self):
        report_path = ROOT / 'reports/tatoeba-positive-inventory.json'
        if not report_path.exists():
            self.skipTest('Snapshot has not been downloaded/filtered')
        report = json.loads(report_path.read_text('utf-8'))
        records = []
        for part in report['parts']:
            path = module.DEST / 'selected' / part
            self.assertLess(path.stat().st_size, 5_000_001)
            records.extend(json.loads(line) for line in path.read_text('utf-8').splitlines())
        self.assertEqual(len({row['id'] for row in records}), len(records))
        self.assertTrue(all(row['language'] == 'cmn' and row['marking']['positiveMarked'] for row in records))
        self.assertTrue(all(not row['secondaryReview']['aiReviewed'] for row in records))
        self.assertEqual(sum(row['marking']['okTag'] for row in records), report['counts']['okTaggedMandarin'])
        self.assertEqual(sum(row['marking']['eligibleForSecondaryReview'] for row in records), report['counts']['eligiblePositiveMarked'])
        audio = report['audio']
        self.assertLessEqual(audio['distinctSentenceIdsInAudioExport'], audio['recordingRows'])
        self.assertEqual(sum(audio['licenseCounts'].values()), audio['recordingRows'])

    def test_translation_handoff_has_only_four_columns_and_exact_direct_source_pairs(self):
        path = ROOT / 'reports/tatoeba-translation-review.tsv'
        if not path.exists():
            self.skipTest('Translation report has not been exported')
        inventory = json.loads((ROOT / 'reports/tatoeba-positive-inventory.json').read_text('utf-8'))
        sources = {row['id']: row for part in inventory['parts']
                   for row in (json.loads(line) for line in (module.DEST / 'selected' / part).read_text('utf-8').splitlines())}
        with path.open(encoding='utf-8', newline='') as stream:
            reader = csv.reader(stream, delimiter='\t')
            self.assertEqual(next(reader), ['id', 'character', 'sentence', 'translation'])
            rows = list(reader)
        self.assertEqual(len(rows), inventory['counts']['possibleAdditionalCharactersWithCleanDirectEnglish'])
        self.assertEqual(len({row[0] for row in rows}), len(rows))
        self.assertEqual(len({row[1] for row in rows}), len(rows))
        for row in rows:
            self.assertEqual(len(row), 4)
            identity, glyph, chinese, english = row
            prefix, cmn_id, eng_id, codepoint = identity.split(':')
            self.assertEqual(prefix, 'tatoeba')
            self.assertEqual(ord(glyph), int(codepoint.removeprefix('U+'), 16))
            source = sources[int(cmn_id)]
            self.assertTrue(source['marking']['eligibleForSecondaryReview'])
            self.assertIn(glyph, chinese)
            self.assertEqual(source['text'], chinese)
            translation = next(item for item in source['englishTranslations'] if item['id'] == int(eng_id))
            self.assertFalse(translation['marking']['holds'])
            self.assertEqual(translation['text'], english)


if __name__ == '__main__':
    unittest.main()
