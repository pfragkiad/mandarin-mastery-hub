"""Review ingestion checks against the supplied before/after editorial evidence."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


reviewer = load('review_ingestion', 'import-shuowen-review.py')
importer = load('review_etymology', 'import-etymology.py')


class ShuowenReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        cls.entries = importer.source_entries(manifest)
        cls.originals = {entry['id']: entry for group in cls.entries.values() for entry in group if entry['sourceId'] == 'shuowen'}
        cls.raw = (reviewer.DIRECTORY / 'handoff.zip').read_bytes()
        cls.review = reviewer.read_archive(cls.raw, cls.originals)

    def mutate_member(self, name, transform):
        out = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(self.raw)) as source, zipfile.ZipFile(out, 'w') as target:
            for member in source.namelist():
                data = source.read(member)
                target.writestr(member, transform(data) if member == name else data)
        return out.getvalue()

    def test_complete_working_copy_has_exact_reported_changes(self):
        stats = self.review['statistics']
        self.assertEqual(stats['entries'], 9833)
        self.assertEqual(stats['translation_edited_entries'], 1938)
        self.assertEqual(stats['overall_changed_entries'], 1943)
        self.assertEqual(stats['resolved_flags'], 16)
        self.assertEqual(stats['remaining_uncertainties'], 899)

    def test_editorial_readings_are_separate_and_keep_original_headwords(self):
        readings = {key: value['sourceReading'] for key, value in self.review['changes'].items() if 'sourceReading' in value}
        self.assertEqual(len(readings), 28)
        self.assertEqual(sum(row['headword'] != self.originals[key]['headword'] for key, row in readings.items()), 7)
        self.assertEqual(self.originals['shuowen:2118']['headword'], '钉')
        self.assertEqual(readings['shuowen:2118']['headword'], '䀘')
        self.assertEqual(readings['shuowen:8950']['headword'], '䶱')
        self.assertEqual(readings['shuowen:9440']['classification'], 'documented_duan_emendation')
        self.assertTrue(readings['shuowen:9440']['evidenceUrls'])
        self.assertEqual(readings['shuowen:9459']['classification'], 'export_format_cleanup')

    def test_changed_original_chinese_is_not_accepted_as_baseline(self):
        originals = copy.deepcopy(self.originals)
        originals['shuowen:2118']['headword'] = '䀘'
        with self.assertRaisesRegex(ValueError, 'baseline Chinese differs'):
            reviewer.read_archive(self.raw, originals)

    def test_tampered_corrected_export_is_rejected(self):
        raw = self.mutate_member('shuowen-english-corrected.txt', lambda data: data.replace(b'At the primordial', b'At an invented', 1))
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            reviewer.read_archive(raw, self.originals)

    def test_duplicate_keys_are_rejected(self):
        raw = self.mutate_member('shuowen-english-corrected.txt', lambda data: data.replace(b'KEY: shuowen:2 ', b'KEY: shuowen:1 ', 1))
        with self.assertRaisesRegex(ValueError, 'Duplicate or invalid review key'):
            reviewer.read_archive(raw, self.originals)

    def test_missing_source_apparatus_is_rejected(self):
        raw = self.mutate_member('shuowen-source-restorations.csv', lambda data: b'\n'.join(data.split(b'\n')[:1] + data.split(b'\n')[2:]))
        with self.assertRaisesRegex(ValueError, 'statistics'):
            reviewer.read_archive(raw, self.originals)

    def test_current_drafts_match_review_and_originals_remain_identical(self):
        manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        entries = copy.deepcopy(self.entries)
        inputs, summary = importer.attach_shuowen_translations(entries, manifest)
        self.assertEqual(summary['uncertain_record_count'], 775)
        effective = reviewer.load_saved(self.originals)
        self.assertEqual(summary['editorial_review']['changed_entry_count'], len(effective['changes']))
        self.assertIn('importer/data/etymology/translations/review/handoff.zip', inputs)
        for group in entries.values():
            for entry in group:
                if entry['sourceId'] != 'shuowen':
                    continue
                key = entry['id']
                original = {field: value for field, value in entry.items() if field != 'translation'}
                self.assertEqual(original, self.originals[key])
                self.assertEqual(entry['translation']['text'], effective['after'][key]['english'])
                self.assertEqual(entry['translation']['uncertain'], effective['after'][key]['uncertain'])
                self.assertEqual(entry['translation'].get('editorialReview'), effective['changes'].get(key))

    def test_orphaned_review_reference_cannot_silently_lose_editorial_readings(self):
        manifest = json.loads((importer.SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        with tempfile.TemporaryDirectory() as directory:
            sources = Path(directory)
            for relative in ['translations/en/001.json', 'translations/source-batches/001.json']:
                target = sources / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((importer.SOURCES / relative).read_bytes())
            with patch.object(importer, 'SOURCES', sources):
                with self.assertRaisesRegex(ValueError, 'missing editorial review input'):
                    importer.attach_shuowen_translations(copy.deepcopy(self.entries), manifest)

    def test_subset_applies_six_english_changes_without_clearing_omitted_flags(self):
        review = reviewer.read_archive(self.raw, self.originals)
        previous = copy.deepcopy(review['after'])
        raw = (reviewer.DIRECTORY / 'uncertain-followup.zip').read_bytes()
        result = reviewer.append_uncertain_followup(review, raw)
        self.assertEqual(result['statistics']['reported_uncertain_entries'], 884)
        self.assertEqual(result['changedKeys'], ['shuowen:53', 'shuowen:192', 'shuowen:592', 'shuowen:1028', 'shuowen:4326', 'shuowen:5076'])
        self.assertEqual(len(result['statistics']['omitted_uncertain_keys']), 15)
        self.assertEqual(result['statistics']['resolved_flags'], 0)
        self.assertEqual(sum(row['uncertain'] for row in review['after'].values()), 899)
        for key, row in review['after'].items():
            self.assertEqual((row['headword'], row['text'], row['uncertain']),
                             (previous[key]['headword'], previous[key]['text'], previous[key]['uncertain']))
            if key not in result['changedKeys']:
                self.assertEqual(row['english'], previous[key]['english'])

    def test_subset_cannot_silently_change_chinese_without_apparatus(self):
        out = io.BytesIO()
        with zipfile.ZipFile(reviewer.DIRECTORY / 'uncertain-followup.zip') as archive, zipfile.ZipFile(out, 'w') as target:
            member = 'shuowen-still-uncertain-only.txt'
            target.writestr(member, archive.read(member).replace('祔、祪'.encode('utf-8'), '祔、他'.encode('utf-8'), 1))
        with self.assertRaisesRegex(ValueError, 'changes Chinese without source apparatus'):
            reviewer.append_uncertain_followup(reviewer.read_archive(self.raw, self.originals), out.getvalue())

    def test_subset_requires_still_uncertain_flags(self):
        out = io.BytesIO()
        with zipfile.ZipFile(reviewer.DIRECTORY / 'uncertain-followup.zip') as archive, zipfile.ZipFile(out, 'w') as target:
            member = 'shuowen-still-uncertain-only.txt'
            target.writestr(member, archive.read(member).replace(b'ENGLISH DRAFT [UNCERTAIN]: ', b'ENGLISH DRAFT: ', 1))
        with self.assertRaisesRegex(ValueError, 'Unexpected key or resolved flag'):
            reviewer.append_uncertain_followup(reviewer.read_archive(self.raw, self.originals), out.getvalue())

    def test_full_v2_explicitly_resolves_the_fifteen_omitted_cases(self):
        review = reviewer.read_archive(self.raw, self.originals)
        reviewer.append_uncertain_followup(review, (reviewer.DIRECTORY / 'uncertain-followup.zip').read_bytes())
        before = copy.deepcopy(review['after'])
        full = reviewer.append_full_v2(review, (reviewer.DIRECTORY / 'uncertainty-reviewed-v2.txt').read_bytes())
        self.assertEqual(full['statistics']['entries'], 9833)
        self.assertEqual(full['statistics']['translation_edited_entries'], 11)
        self.assertEqual(full['statistics']['resolved_flags'], 15)
        self.assertEqual(full['statistics']['uncertain_after'], 884)
        self.assertEqual(set(full['resolvedKeys']), set(review['followup']['statistics']['omitted_uncertain_keys']))
        self.assertEqual({key for key, row in review['after'].items() if row['uncertain']}, set(review['followup']['reportedKeys']))
        self.assertEqual(review['after']['shuowen:113']['english'], before['shuowen:113']['english'])
        self.assertFalse(review['after']['shuowen:113']['uncertain'])
        for key, row in review['after'].items():
            self.assertEqual((row['headword'], row['text']), (before[key]['headword'], before[key]['text']))

    def test_full_v2_must_agree_with_the_884_entry_extract(self):
        review = reviewer.read_archive(self.raw, self.originals)
        reviewer.append_uncertain_followup(review, (reviewer.DIRECTORY / 'uncertain-followup.zip').read_bytes())
        raw = (reviewer.DIRECTORY / 'uncertainty-reviewed-v2.txt').read_bytes()
        raw = raw.replace(b'ENGLISH DRAFT [UNCERTAIN]: ', b'ENGLISH DRAFT: ', 1)
        with self.assertRaisesRegex(ValueError, 'disagrees with its still-uncertain extract'):
            reviewer.append_full_v2(review, raw)

    def test_full_v2_cannot_silently_replace_chinese(self):
        review = reviewer.read_archive(self.raw, self.originals)
        reviewer.append_uncertain_followup(review, (reviewer.DIRECTORY / 'uncertain-followup.zip').read_bytes())
        raw = (reviewer.DIRECTORY / 'uncertainty-reviewed-v2.txt').read_bytes().replace('造分天地'.encode('utf-8'), '他分天地'.encode('utf-8'), 1)
        with self.assertRaisesRegex(ValueError, 'changes Chinese without source apparatus'):
            reviewer.append_full_v2(review, raw)

    def v2_review(self):
        review = reviewer.read_archive(self.raw, self.originals)
        reviewer.append_uncertain_followup(review, (reviewer.DIRECTORY / 'uncertain-followup.zip').read_bytes())
        reviewer.append_full_v2(review, (reviewer.DIRECTORY / 'uncertainty-reviewed-v2.txt').read_bytes())
        return review

    def mutate_v3(self, name, transform):
        out = io.BytesIO()
        with zipfile.ZipFile(reviewer.DIRECTORY / 'external-v3.zip') as source, zipfile.ZipFile(out, 'w') as target:
            for member in source.namelist():
                raw = source.read(member)
                target.writestr(member, transform(raw) if member == name else raw)
        return out.getvalue()

    def test_external_v3_preserves_checked_and_unchecked_scope(self):
        review = self.v2_review()
        before = copy.deepcopy(review['after'])
        stage = reviewer.append_external_v3(review, (reviewer.DIRECTORY / 'external-v3.zip').read_bytes())
        stats = stage['statistics']
        self.assertEqual(stats['cases_reported_checked'], 222)
        self.assertEqual(stats['resolved_flags'], 109)
        self.assertEqual(stats['translation_edited_entries'], 166)
        self.assertEqual(stats['not_checked_this_pass'], 662)
        self.assertEqual(stats['uncertain_after'], 775)
        self.assertEqual(stats['revised_retained'] + stats['checked_retained'], 113)
        for key in stage['checkedKeys']:
            assessment = review['changes'][key]['caseEvidence']
            self.assertTrue(assessment['checkedInSuppliedReview'])
            self.assertTrue(assessment['sourceUrls'])
            self.assertIn('review-assessment', review['changes'][key]['changes'])
            self.assertEqual(review['after'][key]['uncertain'], assessment['decision'] != 'clear')
        for key in stage['uncheckedKeys']:
            self.assertEqual(review['after'][key], before[key])
            self.assertNotIn('caseEvidence', review['changes'].get(key, {}))
        for key, row in review['after'].items():
            self.assertEqual((row['headword'], row['text']), (before[key]['headword'], before[key]['text']))

    def test_external_v3_rejects_undocumented_flag_clearance(self):
        raw = self.mutate_v3('shuowen-english-external-reviewed-v3.txt', lambda data: data.replace(b'ENGLISH DRAFT [UNCERTAIN]: ', b'ENGLISH DRAFT: ', 1))
        with self.assertRaisesRegex(ValueError, 'register disagrees with master'):
            reviewer.append_external_v3(self.v2_review(), raw)

    def test_external_v3_checks_narrative_counts_against_case_data(self):
        raw = self.mutate_v3('shuowen-884-external-verification-v3.md', lambda data: data.replace(b'this pass | 222 |', b'this pass | 223 |', 1))
        with self.assertRaisesRegex(ValueError, 'narrative statistics disagree'):
            reviewer.append_external_v3(self.v2_review(), raw)

    def test_external_v3_rejects_patch_evidence_that_differs_from_register(self):
        def change(raw):
            rows = [json.loads(line) for line in raw.decode('utf-8-sig').splitlines() if line.strip()]
            rows[0]['note'] += ' Undocumented assertion.'
            return '\n'.join(json.dumps(row, ensure_ascii=False) for row in rows).encode('utf-8')
        raw = self.mutate_v3('shuowen-884-resolution-patch-v3.jsonl', change)
        with self.assertRaisesRegex(ValueError, 'patch evidence differs'):
            reviewer.append_external_v3(self.v2_review(), raw)


if __name__ == '__main__':
    unittest.main()
