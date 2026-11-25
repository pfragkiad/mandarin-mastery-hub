"""Review-chain integrity and proposal boundaries; no new linguistic approvals."""
import csv
import hashlib
import importlib.util
import io
from pathlib import Path
import sys
import unittest
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('reconciliation', ROOT / 'scripts/reconcile-tatoeba-reviews.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReviewChainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.summary, cls.outputs = module.build()
        cls.originals = module.keyed(module.read_tsv(ROOT / 'reports/tatoeba-translation-review.tsv'))
        cls.first = module.keyed(module.read_tsv(module.DIRECTORY / module.REVIEW_FILES[0]))
        cls.second = module.keyed(module.read_tsv(module.DIRECTORY / module.REVIEW_FILES[1]))

    def test_requested_scope_is_exact_ok_batch_only(self):
        expected = {row['id'] for row in module.read_tsv(ROOT / 'reports/tatoeba-chinese-english-review-01-ok.tsv')}
        self.assertEqual({row['id'] for row in self.summary['rows']}, expected)
        self.assertEqual(len(expected), 375)
        self.assertEqual(self.summary['counts']['effectiveStatus'], {'Pass': 308, 'Minor_Review': 39, 'Needs_Fix': 28})

    def test_owner_policy_preserves_unreturned_flags_and_applies_returned_rows(self):
        for row in self.summary['rows']:
            if row['id'] in self.second:
                self.assertEqual(row['effectiveStatus'], self.second[row['id']]['overall_status'])
                self.assertEqual(row['reviewer2Disposition'], 'returned_override')
            else:
                self.assertEqual(row['effectiveStatus'], self.first[row['id']]['overall_status'])
                self.assertEqual(row['reviewer2Disposition'], 'accepted_reviewer1_by_owner_instruction')
        self.assertEqual(self.summary['counts']['reviewer2ReturnedInThisBatch'], 39)

    def test_originals_targets_and_pass_text_are_preserved(self):
        for row in self.summary['rows']:
            self.assertTrue(all(row[field] == self.originals[row['id']][field] for field in module.FIELDS))
            self.assertIn(row['character'], row['proposal']['sentence'])
            if row['effectiveStatus'] == 'Pass':
                self.assertEqual((row['proposal']['sentence'], row['proposal']['translation']), (row['sentence'], row['translation']))
            self.assertEqual(row['proposal']['reviewStatus'], 'pending_round_3')
            self.assertFalse(row['display']['proposalApproved'])

    def test_changed_review_text_and_duplicate_ids_fail_closed(self):
        row = next(iter(self.first.values()))
        with self.assertRaises(ValueError):
            module.validate_review([{**row, 'translation': 'changed translation'}], self.originals)
        with self.assertRaises(ValueError):
            module.keyed([row, row])

    def test_proposals_cannot_remove_target_or_apply_unmatched_replacement(self):
        source = {'id': 'test', 'character': 'x', 'sentence': 'x original', 'translation': 'original'}
        with self.assertRaises(ValueError):
            module.proposal_for(source, {'sentence': 'removed target'})
        with self.assertRaises(ValueError):
            module.proposal_for(source, {'sentenceReplacements': [['absent', 'new']]})

    def test_source_hashes_and_all_generated_outputs_match(self):
        for source in self.summary['sources']:
            raw = (module.DIRECTORY / source['file']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), source['sha256'])
        for path, text in self.outputs.items():
            self.assertEqual(path.read_bytes() if isinstance(text, bytes) else path.read_text('utf-8'), text)
        path = module.DIRECTORY / 'batch1-next-review.tsv'
        with path.open(encoding='utf-8', newline='') as stream:
            rows = list(csv.reader(stream, delimiter='\t'))
        self.assertEqual(rows[0], module.FIELDS)
        self.assertEqual(len(rows), 376)
        self.assertTrue(all(len(row) == 4 for row in rows))

    def test_numbered_parts_reconstruct_every_middle_row_and_column(self):
        original = list(csv.reader(io.StringIO(self.outputs[module.DIRECTORY / 'batch1-final-report.tsv']), delimiter='\t'))
        pieces = sorted(path for path in self.outputs if path.name.startswith('batch1-final-report-part-'))
        self.assertEqual(len(pieces), 15)
        reconstructed = [original[0]]
        for path in pieces:
            rows = list(csv.reader(io.StringIO(self.outputs[path]), delimiter='\t'))
            self.assertEqual(rows[0], original[0])
            self.assertEqual(len(rows), 26)
            reconstructed.extend(rows[1:])
        self.assertEqual(reconstructed, original)

    def test_complete_zip_retains_the_full_report_and_all_parts(self):
        data = self.outputs[module.DIRECTORY / 'batch1-final-report-complete.zip']
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(archive.read('batch1-final-report.tsv'), self.outputs[module.DIRECTORY / 'batch1-final-report.tsv'].encode('utf-8'))
            self.assertEqual(len(archive.namelist()), 17)
            for path, value in self.outputs.items():
                if path.parent.name == 'batch1-final-report-parts':
                    self.assertEqual(archive.read(f'batch1-final-report-parts/{path.name}'), value.encode('utf-8'))


if __name__ == '__main__':
    unittest.main()
