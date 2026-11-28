"""Load checksum-bound advanced sentence drafts without changing official words.

Normal assembly uses frozen text and reading inputs only. Structural checks do
not imply native language review; source and contextual reading flags stay visible.
"""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path('importer/data/hsk-level7/sentence-manifest.json')
HAN = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def load_sentences(official_rows):
    manifest_raw = (ROOT / MANIFEST).read_bytes()
    manifest = json.loads(manifest_raw)
    assert manifest['schema_version'] == 'hsk-level7-sentence-inputs/0.0.1'

    def verified(record):
        path = ROOT / record['path']
        raw = path.read_bytes()
        assert len(raw) == record['bytes'], record['path']
        assert digest(raw) == record['sha256'], record['path']
        return raw

    drafts = []
    for record in manifest['drafts']:
        rows = [json.loads(line) for line in verified(record).decode('utf-8').splitlines()]
        assert [r['id'] for r in rows] == list(range(record['id_range'][0], record['id_range'][1] + 1))
        drafts.extend(rows)
    overlay = json.loads(verified(manifest['pinyin']))
    assert overlay['schema_version'] == 'hsk-level7-assisted-sentence-pinyin/0.0.1'
    for record in overlay['sources']:
        raw = (ROOT / record['path']).read_bytes()
        normalization = record.get('checksum_normalization')
        assert normalization in (None, 'lf'), record['path']
        if normalization == 'lf':
            raw = raw.replace(b'\r\n', b'\n')
        assert digest(raw) == record['sha256'], record['path']
    ids = [row['id'] for row in official_rows]
    assert ids == list(range(5401, 11001))
    assert [row['id'] for row in drafts] == ids
    assert [row['id'] for row in overlay['entries']] == ids
    assert overlay['validation']['shared_aligner_passed'] == 5600
    assert overlay['validation']['shared_aligner_failed'] == 0
    assert overlay['validation']['per_syllable_roundtrip_passed'] == 5600
    assert len({row['hanzi'] for row in drafts}) == 5600, 'Duplicate Chinese sentence'
    assert len({row['english'] for row in drafts}) == 5600, 'Duplicate English translation'

    examples = {}
    for official, draft, reading in zip(official_rows, drafts, overlay['entries']):
        assert set(draft) == {'id', 'headword', 'style', 'hanzi', 'english'}
        assert official['hanzi'] == draft['headword'] == reading['headword']
        assert draft['style'] in ('written', 'conversational')
        assert draft['hanzi'].strip() == draft['hanzi'] and official['hanzi'] in draft['hanzi']
        assert draft['english'].strip() and not HAN.search(draft['english'])
        assert reading['pinyin'].strip() and not HAN.search(reading['pinyin'])
        assert digest(draft['hanzi'].encode('utf-8')) == reading['hanzi_sha256']
        target = reading['target']
        assert [target['official_entry'], target['official_pinyin'], target['official_pos_zh']] == [
            official['entry'], official['pinyin'], official['part_of_speech']]
        # Overlay offsets address the original sentence, including punctuation.
        assert draft['hanzi'][target['start']:target['end']] == official['hanzi']
        assert len(target['sentence_syllables']) == len(official['hanzi'])
        example = {
            'style': draft['style'],
            'register': 'neutral_spoken' if draft['style'] == 'conversational' else 'neutral_written',
            'hanzi': draft['hanzi'], 'pinyin': reading['pinyin'], 'english': draft['english'],
            'note': 'Original sense-specific editorial draft; sentence pinyin is mechanically assisted and needs language review.',
            'review_status': 'editorial_draft_needs_language_review',
            'provenance': 'newly_authored', 'linguistic_source': 'editorial_enrichment',
        }
        if reading['review_flags']:
            example['reading_review_flags'] = reading['review_flags']
        examples[official['id']] = [example]
    provenance = {
        'manifest': {'path': MANIFEST.as_posix(), 'sha256': digest(manifest_raw)},
        'policy': 'One newly authored example per official shared Levels 7-9 entry, either conversational or written.',
        'review_status': 'editorial_draft_needs_language_review',
        'pinyin': overlay['provenance'], 'validation': overlay['validation'],
    }
    return examples, provenance
