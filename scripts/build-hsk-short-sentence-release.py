"""Build versioned HSK 2-5 sentence-length corrections and exact audio bindings.

The frozen inputs retain original bytes. Only the 32 over-ceiling examples change;
word identities, meanings, classifications, readings and recordings stay exact.
"""
import argparse
import copy
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('importer/data/hsk-sentence-length')
AUDIT = Path('reports/hsk-short-sentence-release.json')
REPORT = Path('reports/hsk-short-sentence-replacements.md')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def verified(record):
    raw = (ROOT / record['path']).read_bytes()
    assert sha(raw) == record['sha256'], record['path']
    return raw


def build():
    manifest = json.loads((ROOT / INPUT / 'source-manifest.json').read_bytes())
    raw = (ROOT / INPUT / 'replacements.json').read_bytes()
    assert sha(raw) == manifest['replacements_sha256']
    patches = json.loads(raw)
    assert patches['ceilings'] == {'conversational': 16, 'written': 20}
    wanted = {(p['level'], p['id'], p['style']): p for p in patches['replacements']}
    assert len(wanted) == len(patches['replacements']) == 32
    outputs, summaries, changes = {}, [], []
    for record in manifest['levels']:
        level, version = record['level'], record['version']
        baseline_raw = verified(record['baseline'])
        original = json.loads(baseline_raw)
        data = copy.deepcopy(original)
        data['data_version'] = version
        changed = []
        for entry in data['entries']:
            for i, ex in enumerate(entry['examples']):
                key = (level, entry['id'], ex['style'])
                ceiling = patches['ceilings'][ex['style']]
                assert (len(ex['hanzi']) > ceiling) == (key in wanted), ('Unexpected length set', key)
                if key not in wanted:
                    continue
                patch = wanted[key]
                assert len(patch['hanzi']) <= ceiling and entry['headword'] in patch['hanzi']
                assert all(patch[k].strip() for k in ('hanzi', 'pinyin', 'english'))
                updated = {k: copy.deepcopy(ex[k]) for k in ('style', 'register')}
                updated.update({k: patch[k] for k in ('hanzi', 'pinyin', 'english')})
                updated.update(note='Shortened to the owner-requested punctuation-inclusive ceiling; original editorial draft, requiring language review.',
                               review_status='editorial_not_native_certified', provenance='newly_authored',
                               linguistic_source='editorial_enrichment')
                entry['examples'][i] = updated
                changed.append({'level': level, 'id': entry['id'], 'headword': entry['headword'],
                                'style': ex['style'], 'before_chars': len(ex['hanzi']),
                                'after_chars': len(updated['hanzi']), 'before': ex, 'after': updated})
        expected = 29 if level == 5 else 1
        assert len(changed) == expected
        data['verification']['sentence_length_revision'] = {
            'baseline': record['baseline'], 'counting': patches['counting'], 'ceilings': patches['ceilings'],
            'changed_examples': len(changed), 'replacements_sha256': sha(raw),
        }
        compatible = data['verification'].setdefault('runtime_compatible_handoffs', [])
        compatible.append({'file': Path(record['baseline']['path']).name, 'sha256': sha(baseline_raw),
                           'numbering': 'official-site-1219'})
        data.setdefault('changelog', []).append({'version': version, 'date': '2026-11-28',
            'changes': [f'Shortened {len(changed)} over-ceiling examples with matching pinyin and English; current official IDs and word content unchanged.']})
        path = Path(f'importer/hsk/hsk3_level{level}_{version}.json')
        output = encode(data)
        outputs[path] = output
        audio = json.loads(verified(record['audio_baseline']))
        if level == 2:
            audio['handoffSha256'] = sha(output)
        else:
            audio['handoff'] = {'file': path.name, 'sha256': sha(output)}
        audio['sentenceRevision'] = {'baseline_manifest': record['audio_baseline'],
                                     'word_ids_readings_and_recordings_unchanged': True}
        audio_path = Path(f'importer/data/hsk-audio/level{level}-manifest-{version}.json')
        audio_raw = encode(audio)
        outputs[audio_path] = audio_raw
        summaries.append({'level': level, 'previous_source': record['baseline']['path'],
                          'current_source': path.as_posix(), 'sha256': sha(output), 'entries': len(data['entries']),
                          'changed_examples': len(changed), 'audio_manifest': {'path': audio_path.as_posix(), 'sha256': sha(audio_raw)}})
        changes.extend(changed)
    assert len(changes) == 32
    audit = {'schema_version': 'hsk-short-sentence-release/1.0.0', 'counting': patches['counting'],
             'ceilings': patches['ceilings'], 'levels': summaries, 'changed_examples': 32,
             'changed_styles': dict(Counter(c['style'] for c in changes)),
             'word_content_and_official_ids_unchanged': True, 'changes': changes}
    outputs[AUDIT] = encode(audit)
    report = '''# Shortened HSK example sentences

All 32 examples exceeding the owner's limits have replacements: one each in
Levels 2-4, plus 29 in Level 5 (13 conversational and 16 written). Counts include
punctuation, matching the original report: conversational <=16; written <=20.
Written examples of 17-20 characters are retained. Each replacement preserves its
target sense and has matching pinyin/English. Word identities, readings, meanings,
classifications and recordings are unchanged; examples remain editorial drafts.

| Level / current ID / target | Style | Before -> after | Original | Replacement |
| --- | --- | ---: | --- | --- |
'''
    for c in changes:
        report += f"| {c['level']} / {c['id']} / {c['headword']} | {c['style']} | {c['before_chars']} -> {c['after_chars']} | {c['before']['hanzi']} | {c['after']['hanzi']} |\n"
    report += '\n[Machine audit](hsk-short-sentence-release.json) contains both full language triples and exact source hashes.\n'
    outputs[REPORT] = report.encode('utf-8')
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for path, raw in build().items():
        assert len(raw) < 9_000_000, path
        if args.write:
            (ROOT / path).write_bytes(raw)
        else:
            assert (ROOT / path).read_bytes() == raw, path
    print(('Wrote' if args.write else 'Checked') + ' 32 short examples across four versioned handoffs and audio bindings.')


if __name__ == '__main__':
    main()
