"""Check exact idiom identity, taxonomy hierarchy and draft/provenance boundaries."""
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('topics', Path(__file__).with_name('classify-chengyu-topics.py'))
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class IdiomTopicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generated = M.build()
        cls.saved = M.load(M.OUTPUT)
        cls.entries = cls.generated['entries']
        cls.by_id = {entry['id']: entry for entry in cls.entries}
        cls.topics = {row['id']: row for row in cls.generated['taxonomy']['topics']}
        cls.subtopics = {row['id']: row for row in cls.generated['taxonomy']['subtopics']}

    def test_complete_exact_identities_and_input_order(self):
        with M.INPUT.open(encoding='utf-8-sig', newline='') as stream:
            original = list(csv.DictReader(stream, delimiter='\t'))
        self.assertEqual(len(self.entries), 8519)
        self.assertEqual(len(self.by_id), 8519)
        for row, entry in zip(original, self.entries):
            for key in ['id', 'simplified', 'traditional']:
                self.assertEqual(row[key], entry[key])
            self.assertEqual(row['meaning_en'], entry['meaningEn'])

    def test_shared_taxonomy_is_exact_not_a_new_registry(self):
        original = M.load(M.TAXONOMY)
        self.assertEqual(self.generated['taxonomy']['version'], original['version'])
        self.assertEqual(self.generated['taxonomy']['topics'], original['topics'])
        self.assertEqual(self.generated['taxonomy']['subtopics'], original['subtopics'])
        self.assertEqual(len(self.topics), 22)
        self.assertEqual(len(self.subtopics), 25)
        self.assertEqual(self.generated['taxonomy']['sha256'], hashlib.sha256(M.TAXONOMY.read_bytes()).hexdigest())

    def test_all_assignments_obey_parent_and_primary_order(self):
        for entry in self.entries:
            M.validate_assignment(entry, self.topics, self.subtopics)
        with self.assertRaises(ValueError):
            M.validate_assignment(M.assignment('food-drink', 'emotions-attitudes'), self.topics, self.subtopics)
        with self.assertRaises(ValueError):
            M.validate_assignment(M.assignment('invented-topic'), self.topics, self.subtopics)

    def test_literal_images_do_not_replace_curated_semantic_assignments(self):
        expected = {'693': ('qualities-feelings', 'emotions-attitudes'),  # life experiences, not food
                    '70': ('qualities-feelings', 'judgments-evaluation'),  # misfortune, not weather
                    '766': ('qualities-feelings', 'emotions-attitudes'),  # empathy, not shoes
                    '6171': ('qualities-feelings', 'judgments-evaluation'),  # beauty, not wildlife
                    '4919': ('abstract-concepts', None),  # investigate is not invest
                    '7631': ('science-technology', 'engineering-devices')}
        for identity, assignment in expected.items():
            row = self.by_id[identity]
            self.assertEqual((row['primaryTopicId'], row['primarySubtopicId']), assignment)

    def test_figurative_markers_are_words_not_prefixes(self):
        self.assertEqual(M.semantic_text('lit. a tiger; fig. extreme determination'),
                         ('extreme determination', 'explicit_figurative_sense'))
        self.assertEqual(M.semantic_text('(lit.) food; (fig.) a practical strategy')[0], 'a practical strategy')
        self.assertEqual(M.semantic_text('a figure of authority')[0], 'a figure of authority')
        self.assertEqual(M.semantic_text('little by little')[0], 'little by little')
        self.assertEqual(M.semantic_text('lit. an ancient scene')[0], '')

    def test_common_english_metaphors_avoid_false_domains(self):
        self.assertNotEqual(self.by_id['210']['primaryTopicId'], 'food-drink')
        self.assertNotEqual(self.by_id['147']['primaryTopicId'], 'health-wellbeing')
        self.assertNotEqual(self.by_id['8073']['primaryTopicId'], 'leisure-media')
        self.assertNotEqual(self.by_id['1247']['primaryTopicId'], 'society-government-law')

    def test_exact_current_hsk_assignments_remain_in_reference_metadata(self):
        index = M.load(M.VOCABULARY / 'index.json')
        vocabulary = {word['id']: word for part in index['parts'] for word in M.load(M.VOCABULARY / part)}
        count = 0
        for entry in self.entries:
            for recorded in entry['existingVocabulary']:
                word = vocabulary[recorded['vocabularyId']]
                count += 1
                self.assertEqual(recorded['simplified'], word['simplified'])
                for field in M.ASSIGNMENT_FIELDS:
                    self.assertEqual(recorded[field], word['studyMetadata'][field])
        self.assertEqual(count, 5)
        self.assertEqual(self.by_id['4']['existingVocabulary'][0]['primaryTopicId'], 'grammar-functions')
        self.assertEqual(self.by_id['4']['primaryTopicId'], 'qualities-feelings')
        self.assertTrue(self.by_id['4']['differsFromExistingVocabulary'])
        self.assertFalse(self.by_id['2255']['differsFromExistingVocabulary'])

    def test_ambiguous_titles_are_held_with_no_assigned_topic(self):
        held = [entry for entry in self.entries if entry['primaryTopicId'] is None]
        self.assertEqual({entry['id'] for entry in held}, {'5603', '8232'})
        for entry in held:
            self.assertEqual(entry['reviewStatus'], 'unclassified_needs_review')
            self.assertEqual(entry['topicIds'], [])
            self.assertEqual(entry['subtopicIds'], [])
            self.assertIsNone(entry['primarySubtopicId'])

    def test_new_assignments_are_never_marked_accepted(self):
        for entry in self.entries:
            expected = 'recorded_unassessed' if entry['method'] == 'existing_vocabulary_assignment' else (
                'draft_unreviewed' if entry['primaryTopicId'] else 'unclassified_needs_review')
            self.assertEqual(entry['reviewStatus'], expected)
            if entry['confidence'] == 'competing_meaning_rules':
                self.assertIn('competing_topic_evidence', entry['reviewFlags'])
        self.assertFalse(self.generated['policy']['newAssignmentsHumanApproved'])
        self.assertFalse(self.generated['policy']['applicationDataModified'])

    def test_input_fingerprints_and_generated_file_are_current(self):
        for source in self.generated['inputs']:
            self.assertEqual(M.fingerprint(M.ROOT / source['file']), source)
        self.assertEqual(self.saved, self.generated)
        self.assertLess(M.OUTPUT.stat().st_size, 10_000_000)


if __name__ == '__main__':
    unittest.main()
