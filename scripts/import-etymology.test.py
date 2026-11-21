"""Boundary checks for the generated etymology handoff; Python standard library only."""
import hashlib
import json
from pathlib import Path
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/data/etymology'
SOURCES = ROOT / 'importer/data/etymology'


class EtymologyHandoffTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads((DATA / 'index.json').read_text(encoding='utf-8'))
        cls.characters = {}
        cls.shards = {}
        for file, expected in cls.index['shards'].items():
            raw = (DATA / file).read_bytes()
            if hashlib.sha256(raw).hexdigest() != expected['sha256']:
                raise AssertionError(f'Shard integrity failure: {file}')
            cls.shards[file] = json.loads(raw)
            cls.characters.update(cls.shards[file]['characters'])
        cls.entries = {entry['id']: entry for record in cls.characters.values() for entry in record['entries']}

    def test_every_entry_preserves_independently_read_original_text_and_identity(self):
        lines = (SOURCES / 'howell/howell_etymology_text_database.txt').read_bytes().decode('utf-8-sig').splitlines()
        counts = {'howell': 0, 'shuowen': 0}
        with zipfile.ZipFile(SOURCES / 'shuowen/upstream.zip') as archive:
            for entry in self.entries.values():
                counts[entry['sourceId']] += 1
                locator = entry['sourceRecord']['locator']
                if entry['sourceId'] == 'howell':
                    original = lines[locator['startLine'] - 1:locator['endLine']]
                    self.assertEqual(len(original), 8)
                    self.assertEqual(original[0], 'kanji:' + entry['headword'])
                    self.assertEqual(original[6], 'raw_etymology:' + entry['text'])
                    self.assertEqual(entry['id'], f'howell:{ord(entry["headword"]):x}')
                else:
                    raw = archive.read(locator['member'])
                    original = json.loads(raw)
                    self.assertEqual(hashlib.sha256(raw).hexdigest(), locator['memberSha256'])
                    self.assertEqual(original['id'], locator['entryId'])
                    self.assertEqual(original['wordhead'], entry['headword'])
                    self.assertEqual(original['explanation'], entry['text'])
                    self.assertEqual(entry['id'], f'shuowen:{original["id"]}')
        manifest = json.loads((SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(counts, {source['id']: source['inventory']['recordCount'] for source in manifest['sources']})

    def test_every_target_and_reference_keeps_exact_glyph_and_role(self):
        seen = set()
        for glyph, character in self.characters.items():
            for target in [*character['associations'], *character['radicalForms']]:
                self.assertEqual(target['glyph'], glyph)
                self.assertFalse(target['historicalRoleVerified'])
                for entry_id in [*target['entryIds'], *target['candidateEntryIds']]:
                    self.assertEqual(self.entries[entry_id]['headword'], glyph)
                if target['status'] == 'exact-headword':
                    self.assertEqual(target['kind'], 'Characters')
                    self.assertTrue(target['entryIds'])
                if target['status'] == 'blocked-contextual-identity':
                    self.assertEqual(target['entryIds'], [])
                    self.assertTrue(target['candidateEntryIds'])
                if target['status'] == 'no-exact-headword':
                    self.assertEqual(target['entryIds'], [])
                if target in character['associations']:
                    seen.add(target['id'])
                    index = self.index['records'][target['id']]
                    self.assertEqual(index['glyph'], glyph)
                    self.assertEqual(index['status'], target['status'])
        self.assertEqual(seen, set(self.index['records']))

    def test_ambiguous_simplification_is_a_suggestion_without_inherited_text(self):
        record = self.characters['发']
        self.assertEqual(record['entries'], [])
        suggestions = {item['glyph']: item for item in record['relatedFormSuggestions']}
        self.assertTrue({'發', '髮'} <= set(suggestions))
        for item in suggestions.values():
            self.assertTrue(item['requiresReview'])
            for entry_id in item['entryIds']:
                self.assertEqual(self.entries[entry_id]['headword'], item['glyph'])

    def test_jade_variant_cannot_inherit_king_but_character_keeps_its_notes(self):
        variant = self.index['radicalForms']['96/96-1']
        self.assertEqual(variant['glyph'], '王')
        self.assertEqual(variant['contextualIdentity']['parentRadical'], '玉')
        self.assertEqual(variant['status'], 'blocked-contextual-identity')
        self.assertEqual(variant['entryIds'], [])
        self.assertTrue(variant['candidateEntryIds'])
        self.assertEqual(self.index['records']['Characters:王']['status'], 'exact-headword')

    def test_shuowen_duplicate_headwords_survive_without_merging(self):
        ids = {entry['id'] for entry in self.characters['舌']['entries']}
        self.assertTrue({'shuowen:941', 'shuowen:1437'} <= ids)

    def test_babelstone_paths_tokens_regions_and_fail_closed_boundaries(self):
        for character in self.characters.values():
            structure = character['babelstone']
            if not structure:
                continue
            original = json.loads((ROOT / structure['sidecar']).read_text(encoding='utf-8'))['record']
            self.assertNotIn('mapping', structure)
            if structure['status'] == 'stale-tree-binding':
                self.assertNotEqual(structure['currentTreeChecksum'], structure['recordedTreeChecksum'])
                self.assertEqual(structure['alternatives'], [])
                continue
            source_alternatives = [alt for alt in original['comparison']['alternatives'] if alt['directG']]
            self.assertEqual([(alt['expression'], alt['qualifiers']) for alt in structure['alternatives']],
                             [(alt['expression'], alt['qualifiers']) for alt in source_alternatives])
            for alternative in structure['alternatives']:
                paths = [tuple(item['path']) for item in alternative['occurrences']]
                self.assertEqual(len(paths), len(set(paths)))
                if alternative['parseStatus'] == 'unsupported':
                    self.assertEqual(alternative['occurrences'], [])
                for occurrence in alternative['occurrences']:
                    self.assertEqual(occurrence['relationship'], 'graphical-membership-only')
                    self.assertFalse(occurrence['historicalRoleVerified'])
                    if occurrence['tokenKind'] != 'exact-form':
                        self.assertEqual(occurrence['headwordEntryIds'], [])
                    for entry_id in occurrence['headwordEntryIds']:
                        self.assertEqual(self.entries[entry_id]['headword'], occurrence['token'])
        forest = self.characters['林']['babelstone']['alternatives'][0]['occurrences']
        self.assertEqual([(item['token'], item['path']) for item in forest], [('木', [0]), ('木', [1])])
        rest = self.characters['休']['babelstone']['alternatives'][0]['occurrences'][0]
        self.assertEqual(rest['token'], '亻')
        self.assertEqual(rest['headwordEntryIds'], [])

    def test_full_source_notices_follow_every_distributable_shard(self):
        manifest = json.loads((SOURCES / 'manifest.json').read_text(encoding='utf-8'))
        expected = manifest['dataset_metadata']
        for payload in [self.index, *self.shards.values()]:
            metadata = payload['dataset_metadata']
            self.assertEqual(metadata['license_notices'], expected['license_notices'])
            self.assertEqual(metadata['import_date'], expected['import_date'])
            self.assertEqual(metadata['license'], 'source-specific')


if __name__ == '__main__':
    unittest.main()
