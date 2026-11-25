#!/usr/bin/env python3
"""Draft offline idiom topics using the existing Vocabulary taxonomy, with evidence.

No runtime records or input glosses are changed. Rules inspect English meanings,
favor explicit figurative senses, and never match literal Hanzi in a headword.
Editorial overrides and existing exact vocabulary assignments remain distinct.
"""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'importer/data/idioms'
INPUT = BASE / 'chengyu_all8519_english_review.tsv'
RULES = BASE / 'chengyu_topic_rules.json'
TAXONOMY = ROOT / 'importer/hsk/hsk3_topics.json'
VOCABULARY = ROOT / 'src/data/vocabulary'
OUTPUT = BASE / 'chengyu_all8519_topic_classification.json'
ASSIGNMENT_FIELDS = ['primaryTopicId', 'topicIds', 'primarySubtopicId', 'subtopicIds']


def load(path):
    return json.loads(path.read_bytes())


def fingerprint(path):
    raw = path.read_bytes()
    return {'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}


def semantic_text(gloss):
    """Separate explicitly marked figurative meaning from historical/literal imagery."""
    match = re.search(r'\bfig(?:uratively|urative)?\b\.?\s*\)?\s*[:.]?\s*', gloss, re.I)
    if match:
        return gloss[match.end():].strip(), 'explicit_figurative_sense'
    match = re.match(r'^\s*\(?lit(?:erally|eral)?\b\.?\)?\s*[:.]?\s*', gloss, re.I)
    if match:
        # A literal-only gloss supplies no reliable thematic interpretation.
        parts = gloss.split(';', 1)
        return (parts[1].strip(), 'after_explicit_literal_clause') if len(parts) == 2 else ('', 'literal_only_needs_context')
    # Do not turn a dictionary's citation to the Analects into an Education topic.
    text = re.sub(r'\([^)]*\b(?:idiom, from|quote from|quotation from|from the Analects)[^)]*\)', '', gloss, flags=re.I)
    return text.strip(), 'recorded_english_meaning'


def assignment(topic=None, subtopic=None, topics=None, subtopics=None):
    return {'primaryTopicId': topic, 'topicIds': topics if topics is not None else ([topic] if topic else []),
            'primarySubtopicId': subtopic, 'subtopicIds': subtopics if subtopics is not None else ([subtopic] if subtopic else [])}


def validate_assignment(value, topics, subtopics):
    primary = value['primaryTopicId']
    if primary is None:
        if value['topicIds'] or value['primarySubtopicId'] or value['subtopicIds']:
            raise ValueError('Unclassified entry cannot retain assigned topics/subtopics')
        return
    if primary not in topics or not value['topicIds'] or value['topicIds'][0] != primary:
        raise ValueError('Unknown primary topic or invalid primary ordering')
    if len(set(value['topicIds'])) != len(value['topicIds']) or any(topic not in topics for topic in value['topicIds']):
        raise ValueError('Unknown or duplicate secondary topic')
    if len(set(value['subtopicIds'])) != len(value['subtopicIds']):
        raise ValueError('Duplicate subtopic')
    if value['primarySubtopicId'] and (value['primarySubtopicId'] not in value['subtopicIds']
                                     or subtopics.get(value['primarySubtopicId'], {}).get('parent_topic_id') != primary):
        raise ValueError('Primary subtopic must belong to primary topic')
    for subtopic in value['subtopicIds']:
        if subtopics.get(subtopic, {}).get('parent_topic_id') not in value['topicIds']:
            raise ValueError('Subtopic must belong to a listed topic')


def match_rules(text, rules):
    """Keep evidence and competing domains; no weak generic catch-all assignment."""
    matches = []
    for rule in rules:
        terms = list(dict.fromkeys(match.group(0).lower() for match in re.finditer(rule['pattern'], text, re.I)))
        if terms:
            matches.append({'ruleId': rule['id'], 'topicId': rule['topic'], 'subtopicId': rule.get('subtopic'),
                            'score': rule['score'], 'matchedTerms': terms})
    matches.sort(key=lambda item: (-item['score'], -min(len(item['matchedTerms']), 3), item['ruleId']))
    return matches


def build():
    taxonomy, settings = load(TAXONOMY), load(RULES)
    if taxonomy['version'] != settings['taxonomyVersion']:
        raise ValueError('Rules target a different taxonomy')
    topics = {row['id']: row for row in taxonomy['topics']}
    subtopics = {row['id']: row for row in taxonomy['subtopics']}
    for rule in settings['rules']:
        validate_assignment(assignment(rule['topic'], rule.get('subtopic')), topics, subtopics)
        re.compile(rule['pattern'])
    with INPUT.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream, delimiter='\t'))
    original_path = BASE / 'chengyu_all8519_english_review.original.tsv'
    if fingerprint(original_path)['sha256'] != settings['originalSha256']:
        raise ValueError('Topic rules belong to a different original handoff')
    with original_path.open(encoding='utf-8-sig', newline='') as stream:
        original_rows = list(csv.DictReader(stream, delimiter='\t'))
    if len(rows) != 8519 or len({row['id'] for row in rows}) != 8519 or any(not row['meaning_en'] for row in rows):
        raise ValueError('Incomplete or duplicate idiom review handoff')
    if len(original_rows) != len(rows) or any(
        any(row[key] != original[key] for key in original if key != 'meaning_en')
        for row, original in zip(rows, original_rows)
    ):
        raise ValueError('Input IDs, headwords, pinyin, ranking or row order changed')
    originals = {row['id']: row for row in rows}
    for identity, override in settings['overrides'].items():
        if identity not in originals or override['simplified'] != originals[identity]['simplified']:
            raise ValueError(f'Override headword/ID mismatch: {identity}')
        validate_assignment(override, topics, subtopics)
    vocabulary_index = load(VOCABULARY / 'index.json')
    vocabulary_paths = [VOCABULARY / part for part in vocabulary_index['parts']]
    existing = defaultdict(list)
    for path in vocabulary_paths:
        for word in load(path):
            if not word.get('hsk_index') or not word.get('hskSource') or word.get('entryKind') != 'word':
                continue
            for head in set(filter(None, [word.get('simplified'), word.get('traditional')])):
                existing[head].append(word)
    notes = load(BASE / 'chengyu_english_drafts.json').get('notesById', {})
    provenance = {row['id']: row for row in map(json.loads, (BASE / 'chengyu_english_provenance.jsonl').read_text('utf-8').splitlines())}
    entries = []
    for row in rows:
        heads = list(dict.fromkeys(filter(None, [row['simplified'], row['traditional']])))
        matched_words = {word['id']: word for head in heads for word in existing.get(head, [])}
        recorded = []
        for word in matched_words.values():
            meta = word.get('studyMetadata', {})
            recorded.append({'vocabularyId': word['id'], 'simplified': word['simplified'], 'hskLevel': word['hskLevel'],
                             'hskIndex': word['hsk_index'], 'taxonomyVersion': meta.get('taxonomyVersion'),
                             **{field: meta.get(field) for field in ASSIGNMENT_FIELDS}, 'source': meta.get('source')})
        text, text_basis = semantic_text(row['meaning_en'])
        normalized_metaphors = []
        for metaphor in settings.get('englishMetaphors', []):
            text, count = re.subn(metaphor['pattern'], metaphor['meaning'], text, flags=re.I)
            if count:
                normalized_metaphors.append(metaphor['id'])
        matches = match_rules(text, settings['rules'])
        eligible = [match for match in matches if match['score'] >= settings['minimumScore']]
        flags = []
        entry = {'id': row['id'], 'simplified': row['simplified'], 'traditional': row['traditional'],
                 'meaningEn': row['meaning_en'], **assignment(), 'reviewStatus': 'unclassified_needs_review',
                 'method': 'no_sufficient_semantic_evidence', 'confidence': 'unclassified',
                 'reason': 'No sufficiently specific meaning rule matched; no fallback topic was invented.',
                 'meaningBasis': text_basis, 'semanticText': text, 'translationMethod': provenance[row['id']]['method'],
                 'existingVocabulary': recorded, 'matchedRules': matches, 'reviewFlags': flags}
        if normalized_metaphors:
            entry['normalizedEnglishMetaphors'] = normalized_metaphors
        if row['id'] in settings['overrides']:
            override = settings['overrides'][row['id']]
            entry.update({field: override[field] for field in ASSIGNMENT_FIELDS})
            entry.update({'method': 'editorial_override', 'confidence': 'editorial_draft', 'reason': override['reason']})
            if override['primaryTopicId'] is None:
                entry['confidence'] = 'editorial_hold'
        elif recorded and all(item['taxonomyVersion'] == taxonomy['version'] and item['primaryTopicId']
                              and item['primaryTopicId'] != 'grammar-functions' for item in recorded):
            first = recorded[0]
            if all(all(item[field] == first[field] for field in ASSIGNMENT_FIELDS) for item in recorded):
                entry.update({field: first[field] for field in ASSIGNMENT_FIELDS})
                entry.update({'method': 'existing_vocabulary_assignment', 'confidence': 'recorded_not_revalidated',
                              'reason': 'Preserved exact current Vocabulary assignment; acceptance is not inferred.'})
            else:
                flags.append('conflicting_existing_vocabulary_assignments')
        elif eligible:
            winner = eligible[0]
            entry.update(assignment(winner['topicId'], winner['subtopicId']))
            competing = [item for item in eligible[1:] if item['topicId'] != winner['topicId'] and item['score'] >= winner['score'] - 1]
            confidence = 'competing_meaning_rules' if competing else 'specific_meaning_rule' if winner['score'] >= 6 else 'broad_meaning_rule'
            if competing:
                flags.append('competing_topic_evidence')
            entry.update({'method': 'meaning_rules', 'confidence': confidence,
                          'reason': 'Draft from English meaning: ' + winner['ruleId'] + '; matched ' + ', '.join(winner['matchedTerms']) + '.'})
        if entry['primaryTopicId']:
            entry['reviewStatus'] = 'recorded_unassessed' if entry['method'] == 'existing_vocabulary_assignment' else 'draft_unreviewed'
        if text_basis == 'literal_only_needs_context' and entry['method'] != 'editorial_override':
            flags.append('figurative_context_missing')
        if row['id'] in notes:
            entry['sourceNote'] = notes[row['id']]
            flags.append('source_note_requires_review')
        if recorded:
            entry['differsFromExistingVocabulary'] = any(any(entry[field] != item[field] for field in ASSIGNMENT_FIELDS) for item in recorded)
            if entry['differsFromExistingVocabulary']:
                flags.append('proposed_change_to_recorded_topic_only_in_this_sidecar')
        validate_assignment(entry, topics, subtopics)
        entries.append(entry)
    sources = [INPUT, original_path, RULES, TAXONOMY, BASE / 'chengyu_english_drafts.json', BASE / 'chengyu_english_provenance.jsonl',
               VOCABULARY / 'index.json', *vocabulary_paths]
    return {'schemaVersion': 1, 'dataset': 'chengyu_all8519_topic_classification',
            'taxonomy': {'file': TAXONOMY.relative_to(ROOT).as_posix(), 'version': taxonomy['version'],
                         'sha256': fingerprint(TAXONOMY)['sha256'], 'topics': taxonomy['topics'], 'subtopics': taxonomy['subtopics']},
            'policy': {'applicationDataModified': False, 'allRowsRetainedInInputOrder': True,
                       'classificationCertifiesIdiomMembership': False, 'newAssignmentsHumanApproved': False,
                       'sourceEnglishIsUnreviewed': True, 'headwordCharactersUsedForAutomaticClassification': False,
                       'unclassifiedMeans': 'No adequate assignment yet; null fields and empty arrays are intentional.',
                       'secondaryTopics': 'Explicit editorial proposals only; other rule matches are review candidates, not assigned tags.',
                       'existingVocabulary': 'Exact records retained as reference; proposed changes affect only this sidecar.',
                       'scores': 'Rule priorities, not calibrated probabilities; confidence labels describe evidence, not accuracy.'},
            'summary': {'entries': len(entries), 'classified': sum(bool(entry['primaryTopicId']) for entry in entries),
                        'unclassified': sum(not entry['primaryTopicId'] for entry in entries),
                        'draftAssignments': sum(entry['reviewStatus'] == 'draft_unreviewed' for entry in entries),
                        'recordedAssignments': sum(entry['reviewStatus'] == 'recorded_unassessed' for entry in entries),
                        'withSecondaryTopics': sum(len(entry['topicIds']) > 1 for entry in entries),
                        'byMethod': dict(Counter(entry['method'] for entry in entries)),
                        'byConfidence': dict(Counter(entry['confidence'] for entry in entries)),
                        'byPrimaryTopic': dict(Counter(entry['primaryTopicId'] for entry in entries if entry['primaryTopicId'])),
                        'byReviewFlag': dict(Counter(flag for entry in entries for flag in entry['reviewFlags'])),
                        'withExistingVocabulary': sum(bool(entry['existingVocabulary']) for entry in entries)},
            'inputs': [fingerprint(path) for path in sources], 'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    # Compact entries keep the offline handoff below the repository file-size limit.
    prefix = json.dumps({key: value for key, value in result.items() if key != 'entries'}, ensure_ascii=False, indent=2)
    content = prefix[:-2] + ',\n  "entries": [\n' + ',\n'.join(
        '    ' + json.dumps(entry, ensure_ascii=False, separators=(',', ':')) for entry in result['entries']) + '\n  ]\n}\n'
    if len(content.encode('utf-8')) >= 10_000_000:
        raise ValueError('Classification handoff exceeds the repository per-file size limit')
    if args.write:
        OUTPUT.write_text(content, encoding='utf-8', newline='\n')
    elif not OUTPUT.exists() or OUTPUT.read_text('utf-8') != content:
        raise ValueError('Stale idiom topic classification')
    print(json.dumps(result['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
