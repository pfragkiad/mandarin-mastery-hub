#!/usr/bin/env python3
"""Boundary tests for exact and listening-reviewed supplemental audio imports."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('missing_audio', ROOT / 'scripts/import-missing-audio.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class MissingAudioImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = MODULE.read(MODULE.MANIFEST)
        cls.vocabulary = MODULE.vocabulary_store.read_vocabulary()
        cls.catalog = MODULE.read(MODULE.CATALOG)
        cls.review = MODULE.read(MODULE.REVIEW)
        # This fixture reconstructs round one; later source-screened attachments
        # must not make its formerly unresolved rows appear approved by round one.
        round_two = MODULE.read(MODULE.INPUT / 'v2/review.json')
        for selected in round_two['words']:
            next(item for item in cls.vocabulary['entries'] if item['id'] == selected['entryId'])['audio'] = None
        words, characters = MODULE.exact_rows(cls.manifest)
        # Reconstruct the pre-import boundary even when testing an already imported tree.
        for row in words:
            entry = next(item for item in cls.vocabulary['entries'] if item['id'] == row['entryId'])
            entry['audio'] = None
        for selected in cls.review['words']:
            next(item for item in cls.vocabulary['entries'] if item['id'] == selected['entryId'])['audio'] = None
        for row in characters:
            clip = cls.manifest['clips'][MODULE.exact_candidate(row)]
            recording_id = f"supplement-{clip['sha256'][:16]}"
            cls.catalog['audio'].pop(recording_id, None)
            if cls.catalog['readingAudio'].get(row['glyph'], {}).get(row['reading']) == recording_id:
                cls.catalog['readingAudio'][row['glyph']][row['reading']] = None
        for selected in cls.review['characters']:
            clip = cls.manifest['clips'][selected['clipId']]
            cls.catalog['audio'].pop(f"supplement-{clip['sha256'][:16]}", None)
            cls.catalog['readingAudio'][selected['glyph']][selected['reading']] = 'cmn-syl-yan2'
        cls.uploads = {clip['gitBlob']: {
            'project_id': MODULE.PROJECT, 'size': clip['bytes'], 'content_type': clip['mimeType'],
            'url': f"/__l5e/assets-v1/00000000-0000-4000-8000-{clip['sha256'][:12]}/clip.{'wav' if clip['mimeType'] == 'audio/wav' else 'mp3'}",
        } for clip in cls.manifest['clips'].values()}

    def test_current_official_ids_and_exact_attachments(self):
        changed, catalog, report = MODULE.import_data(self.vocabulary, self.catalog, self.manifest, self.uploads)
        self.assertEqual(report['wordsAttached'], 8)
        self.assertEqual(report['wordsChanged'], 8)
        self.assertEqual(report['charactersCoveredByExactWord'], 3)
        self.assertEqual(report['catalogRecordingsChanged'], 1)
        self.assertEqual(report['quarantinedYanUnchanged'], 25)
        self.assertEqual(report['listeningReviewUnchanged'], 218)
        self.assertEqual(report['pendingUpload'], [])
        by_id = {entry['id']: entry for entry in changed['entries']}
        expected = {
            '4acf54bb-a35e-41cf-8844-51c11d4af89f': (1, 108, '了', 'le'),
            '086f1411-69df-4023-b750-b7328a2c5b2c': (2, 301, '啊', 'a'),
            '717719d3-3eb7-40ca-9754-f9094b28ae00': (2, 314, '长', 'cháng'),
            '7e525fd7-5364-49de-9027-3c872408b4fd': (2, 332, '地', 'de'),
            'd8ed9566-08f5-44e0-bd22-988a9ec5ad3b': (2, 333, '得', 'de'),
            '01df3ea4-a740-57a2-b038-38f318b584fb': (3, 583, '得', 'dé'),
            'bd4b67d7-bcb6-502c-adc7-5cc1d763aa29': (4, 1771, '为', 'wéi'),
            'a5a16703-9c9c-534f-a729-558256d5c526': (5, 3183, '为', 'wéi'),
        }
        for entry_id, identity in expected.items():
            entry = by_id[entry_id]
            self.assertEqual((entry['hskLevel'], entry['hsk_index'], entry['simplified'], entry['pinyinDisplay']), identity)
            self.assertEqual(entry['audio']['recordingKind'], 'word')
        self.assertEqual(by_id['bd4b67d7-bcb6-502c-adc7-5cc1d763aa29']['audio'],
                         by_id['a5a16703-9c9c-534f-a729-558256d5c526']['audio'])
        self.assertEqual(catalog['readingAudio']['哇'].get('wā'), (self.catalog['readingAudio'].get('哇') or {}).get('wā'))
        self.assertTrue(catalog['readingAudio']['哇']['wa'].startswith('supplement-'))
        self.assertEqual(catalog['audio'][catalog['readingAudio']['哇']['wa']]['recordingKind'], 'word')

    def test_review_and_quarantine_rows_stay_unattached(self):
        changed, catalog, _ = MODULE.import_data(self.vocabulary, self.catalog, self.manifest, self.uploads)
        original_by_id = {entry['id']: entry for entry in self.vocabulary['entries']}
        for row in self.manifest['words']:
            if row['status'] != 'matched_exact_reading':
                changed_entry = next(entry for entry in changed['entries'] if entry['id'] == row['entryId'])
                self.assertEqual(changed_entry['audio'], original_by_id[row['entryId']]['audio'])
        self.assertEqual(catalog['readingAudio']['言']['yán'], 'cmn-syl-yan2')
        self.assertEqual(catalog['audio']['cmn-syl-yan2'], self.catalog['audio']['cmn-syl-yan2'])

    def test_listening_review_attaches_only_accepted_words_and_yan_replacements(self):
        changed, catalog, report = MODULE.import_data(self.vocabulary, self.catalog, self.manifest, self.uploads, self.review)
        self.assertEqual((report['wordsAttached'], report['exactWordsAttached'], report['reviewedWordsAttached']), (204, 8, 196))
        self.assertEqual(report['wordsChanged'], 204)
        self.assertEqual(report['reviewedCharacterSlotsAttached'], 25)
        self.assertEqual(report['catalogRecordingsChanged'], 26)  # 哇 wa plus every quarantined yán slot.
        self.assertEqual(report['quarantinedYanUnchanged'], 0)
        self.assertEqual(report['listeningReviewUnchanged'], 22)  # 21 words plus non-neutral 呀.
        self.assertEqual(report['pendingUpload'], [])
        by_id = {entry['id']: entry for entry in changed['entries']}
        for row in self.review['unresolvedWords']:
            self.assertIsNone(by_id[row['entryId']]['audio'])
        self.assertNotIn('呀', catalog['readingAudio'])
        self.assertFalse(any(recording_id == 'cmn-syl-yan2' for bindings in catalog['readingAudio'].values()
                             for recording_id in bindings.values()))
        again, catalog_again, second = MODULE.import_data(changed, catalog, self.manifest, self.uploads, self.review)
        self.assertEqual(again, changed)
        self.assertEqual(catalog_again, catalog)
        self.assertEqual((second['wordsChanged'], second['catalogRecordingsChanged'], second['pendingUpload']), (0, 0, []))

    def test_detailed_report_accounts_for_every_supplied_clip(self):
        changed, catalog, _ = MODULE.import_data(self.vocabulary, self.catalog, self.manifest, self.uploads, self.review)
        report = MODULE.detailed_file_report(changed, catalog, self.manifest, self.review)
        self.assertEqual(report['packageCoverage']['uniqueAudioClips'], 318)
        self.assertEqual(report['packageCoverage']['wordReferencedClips'], 307)
        self.assertEqual(report['packageCoverage']['characterReferencedClips'], 19)
        self.assertEqual(report['packageCoverage']['sharedWordAndCharacterClips'], 8)
        self.assertEqual(report['packageCoverage']['unreferencedClips'], 0)
        self.assertEqual(len(report['files']), 318)
        self.assertTrue(all(row['references'] and row['sha256'] for row in report['files']))

    def test_changed_review_outcome_fails_closed(self):
        broken = copy.deepcopy(self.review)
        selected = broken['words'][0]
        selected['clipId'] = next(clip_id for clip_id in self.manifest['clips']
                                  if clip_id != selected['clipId'])
        with self.assertRaisesRegex(ValueError, 'candidate|outcome'):
            MODULE.import_data(self.vocabulary, self.catalog, self.manifest, self.uploads, broken)

    def test_changed_official_id_fails_closed(self):
        changed = copy.deepcopy(self.vocabulary)
        entry = next(item for item in changed['entries'] if item['id'] == '4acf54bb-a35e-41cf-8844-51c11d4af89f')
        entry['hsk_index'] += 1
        with self.assertRaisesRegex(ValueError, 'Changed current HSK identity'):
            MODULE.import_data(changed, self.catalog, self.manifest, self.uploads)

    def test_exact_candidates_rederive_from_source_indexes(self):
        self.assertEqual(MODULE.verify_source_readings(self.manifest), 10)
        broken = copy.deepcopy(self.manifest)
        row = next(row for row in broken['words'] if row['status'] == 'matched_exact_reading')
        row['pinyinDisplay'] = 'lè'
        with self.assertRaises(ValueError):
            MODULE.verify_source_readings(broken)


if __name__ == '__main__':
    unittest.main()
