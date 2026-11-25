"""Integrity and source boundaries for the owner's idiom review handoff."""
import csv
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from urllib.parse import quote

SPEC = importlib.util.spec_from_file_location('idioms', Path(__file__).with_name('populate-chengyu-english.py'))
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class IdiomReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit, cls.outputs = M.build()
        cls.original = M.read_tsv(M.ORIGINAL)
        cls.rows = list(csv.DictReader(io.StringIO(cls.outputs[M.OUTPUT]), delimiter='\t'))
        cls.readings = list(csv.DictReader(io.StringIO(cls.outputs[M.PRONUNCIATIONS]), delimiter='\t'))
        cls.evidence = [json.loads(line) for line in cls.outputs[M.PRONUNCIATION_EVIDENCE].splitlines()]

    def test_exact_original_and_every_non_english_cell_preserved(self):
        self.assertEqual(hashlib.sha256(M.ORIGINAL.read_bytes()).hexdigest(),
                         'cf96427b41a23f53aacb18fd79f556016c84a404cc868d5b3e91dbc4f3333cf2')
        self.assertEqual(len(self.rows), 8519)
        preserved = 0
        for before, after in zip(self.original, self.rows):
            for key in M.FIELDS:
                if key != 'meaning_en' or before[key]:
                    self.assertEqual(before[key], after[key], (before['id'], key))
            self.assertTrue(after['meaning_en'].strip(), before['id'])
            preserved += bool(before['meaning_en'])
        self.assertEqual(preserved, 105)
        self.assertEqual(self.audit['newEnglish'], 8414)

    def test_all_pronunciation_rows_keep_input_identity_order_and_pinyin(self):
        self.assertEqual(len(self.readings), 8519)
        for original, merged in zip(self.original, self.readings):
            for key in ['id', 'frequency_rank', 'simplified', 'traditional']:
                self.assertEqual(original[key], merged[key])
            self.assertEqual(original['pinyin'], merged['supplied_pinyin'])
        self.assertEqual([item['id'] for item in self.evidence], [item['id'] for item in self.original])

    def test_source_bytes_match_pinned_manifest(self):
        manifest = json.loads((M.BASE / 'sources/manifest.json').read_bytes())
        for name, source in manifest['files'].items():
            path = M.BASE / 'sources' / source.get('storedAs', name)
            if name == 'kaikki-Chinese.jsonl.gz' and not path.exists():
                continue  # Optional full download; pinned subset is sufficient.
            raw = path.read_bytes()
            if 'storedAs' in source:
                self.assertEqual(hashlib.sha256(raw).hexdigest(), source['storedSha256'])
                raw = gzip.decompress(raw)
            self.assertEqual(len(raw), source['bytes'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(), source['sha256'])
        subset = manifest['selectedWiktionary']
        raw = (M.BASE / 'sources' / subset['file']).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), subset['sha256'])
        self.assertEqual(len(gzip.decompress(raw).splitlines()), subset['records'])

    def test_whole_idiom_recordings_are_exact_pinned_file_matches(self):
        source = json.loads((M.BASE / 'sources/audio-cmn-matches.json').read_bytes())
        self.assertFalse(source['truncated'])
        attached = [item for item in self.evidence if item['recording']]
        self.assertEqual(len(attached), 134)
        self.assertEqual(len({item['id'] for item in attached}), 134)
        originals = {row['id']: row for row in self.original}
        for item in attached:
            recording = item['recording']
            row = originals[item['id']]
            head = recording['path'].removeprefix('64k/hsk/cmn-').removesuffix('.mp3')
            self.assertIn(head, [row['simplified'], row['traditional']])
            self.assertEqual(recording['url'], 'https://raw.githubusercontent.com/hugolpz/audio-cmn/'
                             + source['commit'] + '/' + quote(recording['path']))
            self.assertRegex(recording['gitBlobSha'], r'^[0-9a-f]{40}$')
            self.assertGreater(recording['bytes'], 0)
            self.assertEqual(recording['validation'], 'exact_headword_file_match_not_listening_reviewed')
            self.assertFalse(item['recordingReadingVerified'])

    def test_numbered_pinyin_and_tone_sensitive_comparison(self):
        self.assertEqual(M.accented_pinyin('nu:3 liu2 ou3 gui4 ma5'), 'nǚ liú ǒu guì ma')
        self.assertEqual(M.reading_key("cháng zhì jiǔ'ān"), M.reading_key('chángzhìjiǔ-ān'))
        self.assertNotEqual(M.reading_key('cháng'), M.reading_key('zhǎng'))
        self.assertNotEqual(M.reading_key('mā'), M.reading_key('má'))

    def test_wiki_readings_exclude_other_languages_and_separate_sandhi(self):
        records = {'甲': [{'word': '甲', 'sounds': [
            {'zh_pron': 'jiǎ [Phonetic: jiá', 'tags': ['Mandarin', 'Standard-Chinese', 'Pinyin']},
            {'zh_pron': 'gaap', 'tags': ['Cantonese', 'Pinyin']},
            {'zh_pron': 'jiaa', 'tags': ['Mandarin', 'Tongyong-Pinyin']},
        ]}]}
        readings = M.wiki_readings('甲', records)
        self.assertEqual([(item['pinyin'], item['phonetic']) for item in readings], [('jiǎ', False), ('jiá', True)])

    def test_a_different_word_order_does_not_supply_a_reading(self):
        other = {'word': '乙甲', 'sounds': [{'zh_pron': 'yǐjiǎ', 'tags': ['Mandarin', 'Pinyin']}],
                 'forms': [{'form': '甲乙', 'tags': ['alternative']}],
                 'senses': [{'alt_of': [{'word': '甲乙'}]}]}
        self.assertEqual(M.wiki_readings('甲乙', {'甲乙': [other]}), [])

    def test_all_new_english_is_unreviewed_and_recorded(self):
        evidence = [json.loads(line) for line in self.outputs[M.PROVENANCE].splitlines()]
        self.assertEqual(len(evidence), 8519)
        for row, item in zip(self.rows, evidence):
            self.assertEqual(row['id'], item['id'])
            self.assertEqual(row['meaning_en'], item['meaning_en'])
            self.assertEqual(item['reviewStatus'], 'provided_unassessed' if item['method'] == 'provided_unchanged'
                             else 'unreviewed_translation_draft')
            if item['method'] == 'petci_dictionary':
                self.assertEqual(item['field'], 'book')
                self.assertFalse(item['machineTranslationColumnsUsed'])

    def test_generated_handoff_is_current(self):
        for path, content in self.outputs.items():
            self.assertEqual(path.read_text('utf-8'), content, path.name)


if __name__ == '__main__':
    unittest.main()
