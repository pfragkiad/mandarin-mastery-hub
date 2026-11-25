#!/usr/bin/env python3
"""Select short, passing teaching examples from the reviewed first-candidate set.

Recorded HSK/lesson examples keep priority in the frontend. The latest returned
Round 3 wording applies consistently to the same source pair; earlier unreviewed
assistant drafts are not silently substituted. Unsuitable and flagged passages
remain in offline reports, never learner cards. Missing suitable examples stay gaps.
"""
import argparse
from collections import Counter
from copy import deepcopy
import hashlib
import importlib.util
import json
import re
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'importer/data/tatoeba'
OUTPUT = ROOT / 'public/data/character-tatoeba-examples.json'
INDEX = ROOT / 'public/data/character-sentence-index.json'
AUDIT = ROOT / 'reports/tatoeba-example-import.json'
REPORT = ROOT / 'reports/tatoeba-example-import.md'
LEARNING_POLICY = {'requiredStatus': 'Pass', 'maxHanzi': 20, 'maxChineseLength': 40, 'maxEnglishLength': 180,
                   'allowUnfinishedTemplates': False}
EXCERPTS = DIRECTORY / 'teaching-excerpts.json'
spec = importlib.util.spec_from_file_location('tatoeba_review', ROOT / 'scripts/reconcile-tatoeba-reviews.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def hanzi_count(text):
    return sum(0x3400 <= ord(char) <= 0x4dbf or 0x4e00 <= ord(char) <= 0x9fff
               or 0xf900 <= ord(char) <= 0xfaff or 0x20000 <= ord(char) <= 0x323af for char in text)


def exclusion_reasons(row):
    """Review acceptance alone does not establish suitability for a character card."""
    reasons = []
    if row['review']['status'] != LEARNING_POLICY['requiredStatus']:
        reasons.append('unresolved_review')
    if not 1 <= hanzi_count(row['sentence']) <= LEARNING_POLICY['maxHanzi']:
        reasons.append('chinese_hanzi_length')
    if len(row['sentence']) > LEARNING_POLICY['maxChineseLength']:
        reasons.append('chinese_total_length')
    if len(row['translation']) > LEARNING_POLICY['maxEnglishLength']:
        reasons.append('english_length')
    if re.search(r'XXX|\.{3}|\u2026|_{2,}|[\r\n]', row['sentence'] + row['translation'], re.I):
        reasons.append('unfinished_template_or_context')
    return reasons


def checked_excerpts(candidates, definitions):
    """Extract only individually checked, checksum-bound bilingual clause spans.

    Parent acceptance is retained separately from the assistant's excerpt check.
    A comma splitter cannot establish translation alignment or standalone grammar.
    """
    parents = {}
    for row in candidates.values():
        pair = (row['binding']['chineseSentenceId'], row['binding']['englishSentenceId'])
        parents.setdefault(pair, []).append(row)
    result, used_ids = [], set()
    for item in definitions:
        if not re.fullmatch(r'[a-z0-9-]+', item['id']) or item['id'] in used_ids:
            raise ValueError('Invalid or duplicate excerpt ID')
        used_ids.add(item['id'])
        sources = parents[tuple(item['pair'])]
        if any(row['review']['status'] != 'Pass' for row in sources):
            raise ValueError(f'Excerpt parent has an unresolved review: {item["id"]}')
        parent = sources[0]
        if review.sha(parent['sentence']) != item['parentChineseSha256'] or review.sha(parent['translation']) != item['parentEnglishSha256']:
            raise ValueError(f'Excerpt parent changed: {item["id"]}')
        spans = {}
        for key, field in [('chinese', 'sentence'), ('english', 'translation')]:
            text = item[key]
            if not text or parent[field].count(text) != 1:
                raise ValueError(f'Excerpt is not one exact source span: {item["id"]}')
            start = parent[field].index(text)
            spans[key] = {'start': start, 'end': start + len(text), 'text': text}
        row = deepcopy(parent)
        row['sentence'] = item['chinese'] + ('' if item['chinese'][-1] in '。！？' else '。')
        english = item['english']
        row['translation'] = english[0].upper() + english[1:] + ('' if english[-1] in '.!?' else '.')
        row['id'] = parent['id'] + ':excerpt:' + item['id']
        row['binding']['displayChineseSha256'] = review.sha(row['sentence'])
        row['binding']['displayEnglishSha256'] = review.sha(row['translation'])
        row['pinyin'] = None
        row['editorial'].update({'chineseChanged': True, 'englishChanged': row['translation'] != row['source']['english']['text'],
                                 'wordingSource': 'checked_source_excerpt', 'pinyin': None, 'pinyinWithheldAfterChineseEdit': True,
                                 'excerpt': {'id': item['id'], 'parentReviewEvidenceId': parent['id'],
                                             'parentChineseSha256': item['parentChineseSha256'], 'parentEnglishSha256': item['parentEnglishSha256'],
                                             'spans': spans, 'offsetUnit': 'Unicode code points',
                                             'check': {'author': 'assistant', 'status': 'accepted_for_character_example',
                                                       'scope': 'Complete Chinese clause and matching English span; punctuation/capitalization only. Not a new external review.'}}})
        row['review']['scope'] = 'Parent sentence review plus assistant-checked excerpt; not target character reading/sense or audio'
        if exclusion_reasons(row):
            raise ValueError(f'Checked excerpt violates teaching limits: {item["id"]}')
        result.append(row)
    return result


def select_learning_examples(candidates, excerpts=()):
    """Replace unsuitable first choices only with an exact, already reviewed pair.

    The actual review evidence ID stays attached; a newly assigned character does
    not become an independently reviewed character-reading/sense example.
    """
    suitable = [row for row in candidates.values() if not exclusion_reasons(row)] + list(excerpts)
    suitable.sort(key=lambda row: (hanzi_count(row['sentence']), len(row['sentence']), len(row['translation']),
                                   -row['review']['latestRound'], not row['source']['okTag'], row['id']))
    examples, held = {}, []
    for record_id, original in candidates.items():
        reasons = exclusion_reasons(original)
        chosen = original if not reasons else next((row for row in suitable if original['character'] in row['sentence']), None)
        if chosen:
            row = deepcopy(chosen)
            row['character'] = original['character']
            row['id'] = f'tatoeba:{row["binding"]["chineseSentenceId"]}:{row["binding"]["englishSentenceId"]}:U+{ord(row["character"]):04X}'
            excerpt = row['editorial'].get('excerpt')
            if excerpt:
                row['id'] += ':excerpt:' + excerpt['id']
            row['selection'] = {'originalCandidateId': original['id'],
                                'reviewEvidenceId': excerpt['parentReviewEvidenceId'] if excerpt else chosen['id'],
                                'reassigned': row['id'] != original['id'],
                                'reviewScope': 'sentence_pair_not_character_reading_or_sense'}
            row['review']['round3ReturnedForThisId'] = row['id'] in row['review']['round3EvidenceIds']
            examples[record_id] = row
        if reasons:
            held.append({'recordId': record_id, 'candidateId': original['id'], 'character': original['character'],
                         'sentence': original['sentence'], 'translation': original['translation'],
                         'reviewStatus': original['review']['status'], 'reasons': reasons,
                         'replacementId': examples[record_id]['id'] if chosen else None})
    return examples, held


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
    candidates = {}
    for identity, original in originals.items():
        prefix, zh_id, en_id, codepoint = identity.split(':')
        glyph = original['character']
        if prefix != 'tatoeba' or codepoint != f'U+{ord(glyph):04X}' or glyph not in ids or ids[glyph] != f'Characters:{glyph}':
            raise ValueError(f'Wrong catalogue/source identity: {identity}')
        sentence = records[int(zh_id)]
        translations = {row['id']: row for row in sentence['englishTranslations']}
        candidates[ids[glyph]] = import_example(original, sentence, translations[int(en_id)], first[identity], second.get(identity),
                                               round3_pairs.get((int(zh_id), int(en_id))))
    excerpt_definitions = json.loads(EXCERPTS.read_bytes())['excerpts']
    excerpts = checked_excerpts(candidates, excerpt_definitions)
    examples, held = select_learning_examples(candidates, excerpts)
    input_paths = [ROOT / 'reports/tatoeba-translation-review.tsv', ROOT / 'reports/tatoeba-chinese-english-review-01-ok.tsv', ROOT / 'public/data/catalog_ids.json',
                   DIRECTORY / 'manifest.json', ROOT / 'reports/tatoeba-positive-inventory.json',
                   *(DIRECTORY / 'selected' / part for part in inventory['parts']),
                   *(review.DIRECTORY / name for name in review.REVIEW_FILES), review.DIRECTORY / review.ROUND3_FILE,
                   review.DIRECTORY / 'batch1-suggested-corrections.json', EXCERPTS]
    bindings = [file_binding(path) for path in input_paths]
    selected_audio = {sentence_id: records[sentence_id]['audio'] for sentence_id in {row['binding']['chineseSentenceId'] for row in examples.values()}}
    counts = {'characterAssignments': len(examples),
              'reviewedCandidateAssignments': len(candidates),
              'retainedFirstChoices': sum(not row['selection']['reassigned'] for row in examples.values()),
              'replacedFirstChoices': sum(row['selection']['reassigned'] for row in examples.values()),
              'heldOriginalCandidates': len(held), 'unfilledCharacters': len(candidates) - len(examples),
              'excerptAssignments': sum('excerpt' in row['editorial'] for row in examples.values()),
              'distinctExcerptsUsed': len({row['editorial']['excerpt']['id'] for row in examples.values() if 'excerpt' in row['editorial']}),
              'maximumDisplayedHanzi': max((hanzi_count(row['sentence']) for row in examples.values()), default=0),
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
    audit = {'version': 2, 'generator': 'scripts/import-tatoeba-examples.py', 'counts': counts, 'inputs': bindings,
             'learningPolicy': LEARNING_POLICY, 'heldCandidates': held,
             'policy': 'Only short, passing, complete examples appear in learner cards. Retain eligible first choices; replace unsuitable ones with an already reviewed Pass sentence or an individually checked bilingual excerpt containing the exact target. Preserve parent review evidence and separate excerpt checks. Hold unresolved, long and template candidates offline. Never crop by length or invent lexical wording. Keep latest reviewed wording, attribution and original bindings.',
             'applicationPriority': 'Existing vocabulary examples, then exact HSK/lesson fallback, then exact Tatoeba assignment.'}
    data = {'version': 2, 'generator': audit['generator'], 'learningPolicy': LEARNING_POLICY, 'counts': counts, 'examples': examples}
    markdown = f'''# Tatoeba teaching-example selection

Selected **{len(examples):,} short, passing character examples** from the 1,224 reviewed
first candidates, covering {counts['distinctSourcePairs']} Chinese/English source pairs.
Existing vocabulary and lesson examples stay first and retain their own annotations.

## Learner suitability gate

- Latest review must be **Pass**. Minor Review and Needs Fix remain offline.
- At most **20 Han characters**, 40 total Chinese-line characters and 180 English characters.
- No unfinished XXX templates, ellipses or multiline passages.
- A longer Pass source may supply an individually checked complete clause with
  an exact matching English span. Preserve both full-source links, span offsets,
  parent text hashes and the separate assistant excerpt check. Never crop by length.

Kept {counts['retainedFirstChoices']} first choices and replaced {counts['replacedFirstChoices']} with suitable
already-reviewed sentences containing the same exact character. **{counts['unfilledCharacters']} characters
remain without a suitable Tatoeba example**; a gap is preferable to an unresolved or long passage.
The {len(held)} excluded first candidates and replacement decisions are preserved in the
[offline audit](tatoeba-example-import.json), including the long Biden sentence for 州.
The selection includes **{counts['excerptAssignments']} assignments from {counts['distinctExcerptsUsed']} checked excerpts**.
Only terminal punctuation and initial English capitalization change; no lexical text is invented.

| Most recent recorded review | Assignments |
| --- | ---: |
''' + '\n'.join(f'| {status} | {count} |' for status, count in counts['latestReviewStatus'].items()) + f'''

No unresolved review cases are published as learning examples. The browser repeats
the suitability gate, rejecting stale pre-filter data and overlong/flagged rows.
Public source hints retain attribution and original wording after edits, without
exposing internal review workflow.

Round 3 returned 94 character-specific IDs. Its reviewed sentence pairs cover
{counts['round3ReviewedPairAssignments']} selected assignments; the same corrected wording is reused
with explicit evidence IDs. This does not turn unreturned character IDs into returned reviews.
Chinese changes affect {counts['chineseEditedAssignments']} assignments and English changes affect
{counts['englishEditedAssignments']}; counts overlap. Earlier assistant-only drafts are not substituted.

Every row retains both Tatoeba sentence IDs, contributors, source links, CC BY 2.0 FR
attribution and original/display text hashes. Original text remains in the source metadata.
The popup distinguishes original text and editorial wording and shows reviewer notes.

Source pinyin transcriptions remain preserved as provenance and are withheld after
Chinese edits. The frontend retains the site's current pinyin/audio presentation.
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
                  INDEX: json.dumps({'version': 2, 'records': availability}, ensure_ascii=False, separators=(',', ':')) + '\n',
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
