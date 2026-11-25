#!/usr/bin/env python3
"""Import the owner's full first-candidate set with exact source/review bindings.

Recorded HSK/lesson examples keep priority in the frontend. The latest returned
Round 3 wording applies consistently to the same source pair; earlier unreviewed
assistant drafts are not silently substituted. Unresolved findings stay visible.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'importer/data/tatoeba'
OUTPUT = ROOT / 'public/data/character-tatoeba-examples.json'
INDEX = ROOT / 'public/data/character-sentence-index.json'
AUDIT = ROOT / 'reports/tatoeba-example-import.json'
REPORT = ROOT / 'reports/tatoeba-example-import.md'
spec = importlib.util.spec_from_file_location('tatoeba_review', ROOT / 'scripts/reconcile-tatoeba-reviews.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def file_binding(path):
    raw = path.read_bytes()
    return {'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}


def source_ref(row):
    return {key: row[key] for key in ('id', 'text', 'url', 'contributor', 'license')}


def import_example(original, sentence, translation, r1, r2, round3):
    """Keep source, prior findings and editorial wording distinct, with no stale audio/pinyin."""
    identity = original['id']
    if original['sentence'] != sentence['text'] or original['translation'] != translation['text']:
        raise ValueError(f'Source text mismatch: {identity}')
    if not sentence['marking']['eligibleForSecondaryReview'] or translation['marking']['holds']:
        raise ValueError(f'Source is on hold: {identity}')
    if sentence['language'] != 'cmn' or translation['language'] != 'eng':
        raise ValueError(f'Wrong source language: {identity}')
    if sentence['license'] != 'CC BY 2.0 FR' or translation['license'] != 'CC BY 2.0 FR':
        raise ValueError(f'Unexpected source licence: {identity}')
    latest = r2 or r1
    zh, en = original['sentence'], original['translation']
    status = latest['overall_status']
    notes = latest['review_notes']
    if round3:
        zh, en = round3['round3_suggested_sentence'], round3['round3_suggested_translation']
        status, notes = round3['round3_status'], round3['round3_notes']
    if original['character'] not in zh or not en:
        raise ValueError(f'Imported correction loses target/translation: {identity}')
    transcriptions = sorted((row for row in sentence['transcriptions'] if row['script'] == 'Latn' and row['text'].strip()),
                            key=lambda row: (not row['markedReviewed'], row['text']))
    # A reading belongs to the recorded Chinese, never a changed editorial sentence.
    pinyin = transcriptions[0] if transcriptions and zh == sentence['text'] else None
    changed_zh, changed_en = zh != sentence['text'], en != translation['text']
    return {
        'id': identity, 'character': original['character'], 'sentence': zh, 'translation': en,
        'pinyin': pinyin['text'] if pinyin else None, 'audio': None,
        'binding': {'chineseSentenceId': sentence['id'], 'englishSentenceId': translation['id'],
                    'originalChineseSha256': review.sha(sentence['text']), 'originalEnglishSha256': review.sha(translation['text']),
                    'displayChineseSha256': review.sha(zh), 'displayEnglishSha256': review.sha(en)},
        'source': {'kind': 'tatoeba', 'label': 'Tatoeba', 'chinese': source_ref(sentence), 'english': source_ref(translation),
                   'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/fr/',
                   'okTag': sentence['marking']['okTag'], 'positiveRatings': sentence['marking']['positiveReviews']},
        'review': {'status': status, 'latestRound': 3 if round3 else 2 if r2 else 1,
                   'scope': 'Chinese quality and English fidelity; not target character reading/sense or audio',
                   'notes': notes,
                   'reviewer1': {key: r1[key] for key in review.REVIEW_FIELDS},
                   'reviewer2': {key: r2[key] for key in review.REVIEW_FIELDS} if r2 else None,
                   'reviewer2Disposition': 'returned_override' if r2 else 'accepted_reviewer1_by_owner_instruction',
                   'round3': ({key: round3[key] for key in ['round3_status'] + review.ROUND3_FIELDS} if round3 else None),
                   'round3ReturnedForThisId': bool(round3 and identity in round3['reviewedIds']),
                   'round3EvidenceIds': round3['reviewedIds'] if round3 else [],
                   'pinyinVerified': False, 'targetCharacterSenseVerified': False, 'audioVerified': False},
        'editorial': {'chineseChanged': changed_zh, 'englishChanged': changed_en,
                      'wordingSource': 'round3_reviewer_suggestion' if round3 and (changed_zh or changed_en) else 'unchanged_tatoeba_source',
                      'importAuthorization': 'owner_requested_first_candidate_set_with_latest_reviewed_content',
                      'pinyin': pinyin, 'pinyinWithheldAfterChineseEdit': changed_zh,
                      'recordingsImported': False,
                      'recordingEvidence': {'externalRecordingsAllowed': True, 'sourceRecordingCount': len(sentence['audio']),
                                            'missingLicenseCount': sum(not row['license'] for row in sentence['audio']),
                                            'policy': 'Exact displayed Chinese plus explicit per-recording reuse permission required.'}},
        'display': {'marker': 'source_info' if status == 'Pass' else 'warning_triangle',
                    'label': 'Sentence source and review details' if status == 'Pass' else 'Sentence has unresolved review findings'},
    }


def build():
    originals = review.keyed(review.read_tsv(ROOT / 'reports/tatoeba-translation-review.tsv'))
    ids = json.loads((ROOT / 'public/data/catalog_ids.json').read_bytes())['characters']
    inventory = json.loads((ROOT / 'reports/tatoeba-positive-inventory.json').read_bytes())
    records = {}
    for part in inventory['parts']:
        for line in (DIRECTORY / 'selected' / part).read_text('utf-8').splitlines():
            record = json.loads(line)
            if record['id'] in records:
                raise ValueError('Duplicate Tatoeba source ID')
            records[record['id']] = record
    first, second = [review.validate_review(review.read_tsv(review.DIRECTORY / name), originals) for name in review.REVIEW_FILES]
    # Reuse the strict Part 1 handoff validation; this also preserves the owner R2 rule.
    chain, _ = review.build()
    round3_pairs = {}
    for row in chain['rows']:
        if row['reviewer3']:
            pair = (row['binding']['chineseSentenceId'], row['binding']['englishSentenceId'])
            item = round3_pairs.setdefault(pair, {**row['reviewer3'], 'reviewedIds': []})
            if any(item[key] != row['reviewer3'][key] for key in ['round3_status'] + review.ROUND3_FIELDS):
                raise ValueError('Inconsistent reviewed wording for source pair')
            item['reviewedIds'].append(row['id'])
    examples = {}
    for identity, original in originals.items():
        prefix, zh_id, en_id, codepoint = identity.split(':')
        glyph = original['character']
        if prefix != 'tatoeba' or codepoint != f'U+{ord(glyph):04X}' or glyph not in ids or ids[glyph] != f'Characters:{glyph}':
            raise ValueError(f'Wrong catalogue/source identity: {identity}')
        sentence = records[int(zh_id)]
        translations = {row['id']: row for row in sentence['englishTranslations']}
        examples[ids[glyph]] = import_example(original, sentence, translations[int(en_id)], first[identity], second.get(identity),
                                              round3_pairs.get((int(zh_id), int(en_id))))
    input_paths = [ROOT / 'reports/tatoeba-translation-review.tsv', ROOT / 'reports/tatoeba-chinese-english-review-01-ok.tsv', ROOT / 'public/data/catalog_ids.json',
                   DIRECTORY / 'manifest.json', ROOT / 'reports/tatoeba-positive-inventory.json',
                   *(DIRECTORY / 'selected' / part for part in inventory['parts']),
                   *(review.DIRECTORY / name for name in review.REVIEW_FILES), review.DIRECTORY / review.ROUND3_FILE,
                   review.DIRECTORY / 'batch1-suggested-corrections.json']
    bindings = [file_binding(path) for path in input_paths]
    selected_audio = {sentence_id: records[sentence_id]['audio'] for sentence_id in {row['binding']['chineseSentenceId'] for row in examples.values()}}
    counts = {'characterAssignments': len(examples),
              'distinctSourcePairs': len({(row['binding']['chineseSentenceId'], row['binding']['englishSentenceId']) for row in examples.values()}),
              'latestReviewStatus': dict(Counter(row['review']['status'] for row in examples.values())),
              'warningTriangles': sum(row['display']['marker'] == 'warning_triangle' for row in examples.values()),
              'round3ReturnedIds': sum(row['review']['round3ReturnedForThisId'] for row in examples.values()),
              'round3ReviewedPairAssignments': sum(row['review']['latestRound'] == 3 for row in examples.values()),
              'chineseEditedAssignments': sum(row['editorial']['chineseChanged'] for row in examples.values()),
              'englishEditedAssignments': sum(row['editorial']['englishChanged'] for row in examples.values()),
              'withSourcePinyin': sum(row['pinyin'] is not None for row in examples.values()), 'importedRecordings': 0,
              'sourceRecordings': sum(len(rows) for rows in selected_audio.values()),
              'sourceRecordingsWithoutLicense': sum(not row['license'] for rows in selected_audio.values() for row in rows)}
    audit = {'version': 1, 'generator': 'scripts/import-tatoeba-examples.py', 'counts': counts, 'inputs': bindings,
             'policy': 'Full owner-requested 1224 first candidates. Latest Round 3 pair wording is shared consistently with evidence IDs, without claiming every character ID was returned. Otherwise retain source wording and R2-or-R1 findings. Unresolved flags use warning triangles. No unreviewed assistant-only wording, generated pinyin or imported recordings.',
             'applicationPriority': 'Existing vocabulary examples, then exact HSK/lesson fallback, then exact Tatoeba assignment.'}
    data = {'version': 1, 'generator': audit['generator'], 'counts': counts, 'examples': examples}
    markdown = f'''# Tatoeba first-candidate import

Imported **{len(examples):,} exact character assignments**, covering {counts['distinctSourcePairs']} distinct
Chinese/English source pairs. Existing HSK vocabulary and lesson examples keep priority.

| Most recent recorded review | Assignments |
| --- | ---: |
''' + '\n'.join(f'| {status} | {count} |' for status, count in counts['latestReviewStatus'].items()) + f'''

**{counts['warningTriangles']} assignments show warning triangles** for unresolved findings.
These are imported learning examples with recorded review status, not universal linguistic certification.

Round 3 returned 94 character-specific IDs. Its reviewed sentence pairs cover
{counts['round3ReviewedPairAssignments']} assignments in this full set; the same corrected wording is reused
with explicit evidence IDs. This does not turn unreturned character IDs into returned reviews.
Chinese changes affect {counts['chineseEditedAssignments']} assignments and English changes affect
{counts['englishEditedAssignments']}; counts overlap. Earlier assistant-only drafts are not substituted.

Every row retains both Tatoeba sentence IDs, contributors, source links, CC BY 2.0 FR
attribution and original/display text hashes. Original text remains in the source metadata.
The popup distinguishes original text and editorial wording and shows reviewer notes.

Pinyin is recorded source transcription, never generated from the character reading.
It is withheld for changed Chinese. Source transcriptions remain unverified here.
External recordings are allowed when the exact displayed Chinese and per-recording
reuse permission are confirmed. All {counts['sourceRecordings']} recordings attached to these candidates
lack a reuse licence in the preserved export, so none is attached for playback.
Existing validated Mandarin TTS is available only where a source sentence reading is present.
See the [official audio attribution guidance](https://en.wiki.tatoeba.org/articles/show/faq).

Runtime: [character-tatoeba-examples.json](../public/data/character-tatoeba-examples.json),
fetched lazily by `src/lib/character-tatoeba-examples.ts`.
Audit: [input hashes and counts](tatoeba-example-import.json).
Review inputs: [preserved reports](../importer/data/tatoeba/reports/README.md).

Regenerate with `python scripts/import-tatoeba-examples.py --write`; check with `--check`.
'''
    availability = {key: row['display']['marker'] for key, row in examples.items()}
    lessons = json.loads((ROOT / 'public/data/character-hsk-examples.json').read_bytes())['examples']
    availability.update({key: 'source_info' for key in lessons})
    audit['inputs'].append(file_binding(ROOT / 'public/data/character-hsk-examples.json'))
    return data, {OUTPUT: json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n',
                  INDEX: json.dumps({'version': 1, 'records': availability}, ensure_ascii=False, separators=(',', ':')) + '\n',
                  AUDIT: json.dumps(audit, ensure_ascii=False, indent=2) + '\n', REPORT: markdown}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true'); mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data, outputs = build()
    for path, content in outputs.items():
        if args.write:
            path.write_text(content, encoding='utf-8', newline='\n')
        elif not path.exists() or path.read_text('utf-8') != content:
            raise ValueError(f'Stale Tatoeba example output: {path.name}')
    print(json.dumps(data['counts'], indent=2))


if __name__ == '__main__':
    main()
