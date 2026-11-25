#!/usr/bin/env python3
"""Populate only missing English cells in the supplied idiom review TSV.

Original rows and 105 supplied translations remain unchanged. Exact dictionary
lookups and assistant-authored drafts are individually attributed, not approved.
"""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'importer/data/idioms'
ORIGINAL = BASE / 'chengyu_all8519_english_review.original.tsv'
OUTPUT = BASE / 'chengyu_all8519_english_review.tsv'
DRAFTS = BASE / 'chengyu_english_drafts.json'
PROVENANCE = BASE / 'chengyu_english_provenance.jsonl'
PENDING = BASE / 'chengyu_english_pending.tsv'
AUDIT = BASE / 'chengyu_english_population.json'
PRONUNCIATIONS = BASE / 'chengyu_all8519_pronunciations_merged.tsv'
PRONUNCIATION_EVIDENCE = BASE / 'chengyu_pronunciation_provenance.jsonl'
CEDICT = ROOT / 'importer/data/character-readings/cedict_1_0_ts_utf-8_mdbg.txt.gz'
FIELDS = ['id', 'frequency_rank', 'simplified', 'traditional', 'pinyin', 'meaning_en']


def read_tsv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream, delimiter='\t')
        rows = list(reader)
    if not rows or any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError(f'Malformed TSV: {path.name}')
    if len({row['id'] for row in rows}) != len(rows):
        raise ValueError(f'Duplicate IDs: {path.name}')
    return rows


def unique(values):
    return list(dict.fromkeys(value for value in values if value))


def accented_pinyin(text):
    """Convert recorded numbered syllables; retain all other source characters."""
    marks = '\u0304\u0301\u030c\u0300'
    def syllable(match):
        letters = match[1].replace('u:', '\u00fc').replace('U:', '\u00dc').replace('v', '\u00fc').replace('V', '\u00dc')
        tone = int(match[2])
        if tone in (0, 5):
            return letters
        lower = letters.lower()
        if 'a' in lower: index = lower.index('a')
        elif 'e' in lower: index = lower.index('e')
        elif 'ou' in lower: index = lower.index('o')
        else:
            vowels = [index for index, char in enumerate(lower) if char in 'iou\u00fc']
            index = vowels[-1] if vowels else len(letters) - 1
        return unicodedata.normalize('NFC', letters[:index + 1] + marks[tone - 1] + letters[index + 1:])
    return re.sub(r'([A-Za-z\u00fc\u00dc:]+)([0-5])', syllable, text)


def reading_key(text):
    # Ignore layout, not tone marks. Differences are review signals, not errors.
    return re.sub(r"[\s'\u2019\u02bc\u00b7-]+", '', unicodedata.normalize('NFC', text).lower())


def wiki_readings(head, records, seen=(), allowed_heads=None):
    """Use exact heads/script forms; a synonym's reading cannot pronounce this word."""
    if not head or head in seen:
        return []
    allowed_heads = allowed_heads or {head}
    result = []
    for entry in records.get(head, []):
        if entry['word'] not in allowed_heads and not any(
            form.get('form') in allowed_heads and set(form.get('tags', [])) & {'Simplified-Chinese', 'Traditional-Chinese'}
            for form in entry.get('forms', [])
        ):
            continue
        for sound in entry.get('sounds', []):
            tags = sound.get('tags', [])
            if 'Mandarin' in tags and 'Pinyin' in tags and 'Cantonese' not in tags and sound.get('zh_pron'):
                raw = sound['zh_pron']
                parts = re.split(r'\s*\[Phonetic:\s*', raw, maxsplit=1)
                for index, text in enumerate(parts):
                    result.append({'source': 'wiktionary', 'word': entry['word'], 'pinyin': text.rstrip(']').strip(),
                                   'rawPinyin': raw, 'phonetic': index == 1 or 'phonetic' in tags,
                                   'regional': not (set(tags) & {'Standard', 'Standard-Chinese'} or set(tags) == {'Mandarin', 'Pinyin'}),
                                   'tags': tags, 'rawTags': sound.get('raw_tags', []),
                                   'url': 'https://en.wiktionary.org/wiki/' + quote(entry['word'])})
        targets = list(entry.get('redirects', []))
        for sense in entry.get('senses', []):
            for link in sense.get('alt_of', []) + sense.get('form_of', []):
                targets.extend(target.strip() for target in link['word'].split(' /'))
        for target in unique(targets):
            if target in allowed_heads:
                result += wiki_readings(target, records, seen + (head,), allowed_heads)
    return result


def pronunciation_rows(rows, cedict, wiki, chinese):
    audio_file = json.loads((BASE / 'sources/audio-cmn-matches.json').read_bytes())
    if audio_file['truncated'] or len(audio_file['records']) != audio_file['matchingIdioms']:
        raise ValueError('Incomplete recording inventory')
    recordings = {entry['id']: entry for entry in audio_file['records']}
    if len(recordings) != len(audio_file['records']) or not set(recordings) <= {row['id'] for row in rows}:
        raise ValueError('Duplicate or unmatched recording identity')
    output, provenance = [], []
    for row in rows:
        heads = unique([row['simplified'], row['traditional']])
        evidence = []
        for head in heads:
            for entry in cedict.get(head, []):
                evidence.append({'source': 'cc_cedict', 'word': head, 'rawPinyin': entry['pinyin'],
                                 'pinyin': accented_pinyin(entry['pinyin']), 'phonetic': False,
                                 'url': 'https://www.mdbg.net/chinese/dictionary?page=worddict&wdqb=' + quote(head)})
            evidence += wiki_readings(head, wiki, allowed_heads=set(heads))
            if head in chinese and chinese[head].get('pinyin'):
                evidence.append({'source': 'chinese_xinhua', 'word': head, 'pinyin': chinese[head]['pinyin'],
                                 'phonetic': False, 'url': 'https://github.com/pwxcoo/chinese-xinhua/blob/master/data/idiom.json'})
        evidence = [json.loads(item) for item in unique(json.dumps(item, ensure_ascii=False, sort_keys=True) for item in evidence)]
        lexical = [item for item in evidence if not item['phonetic'] and not item.get('regional')]
        alternatives = unique(item['pinyin'] for item in lexical if reading_key(item['pinyin']) != reading_key(row['pinyin']))
        agreement = 'no_dictionary_reading' if not lexical else ('matches_at_least_one_source' if any(
            reading_key(item['pinyin']) == reading_key(row['pinyin']) for item in lexical) else 'differs_from_all_listed_sources_review')
        recording = recordings.get(row['id'])
        if recording and (recording['simplified'] != row['simplified'] or recording['traditional'] != row['traditional']
                          or recording['path'] != '64k/hsk/cmn-' + row['simplified'] + '.mp3'
                          and recording['path'] != '64k/hsk/cmn-' + row['traditional'] + '.mp3'):
            raise ValueError(f'Recording identity mismatch: {row["id"]}')
        merged = {key: row[key] for key in ['id', 'frequency_rank', 'simplified', 'traditional']}
        merged['supplied_pinyin'] = row['pinyin']
        for source in ['cc_cedict', 'wiktionary', 'chinese_xinhua']:
            merged[source + '_pinyin'] = ' | '.join(unique(item['pinyin'] for item in lexical if item['source'] == source))
        merged.update({'wiktionary_phonetic_pinyin': ' | '.join(unique(item['pinyin'] for item in evidence if item['phonetic'] and not item.get('regional'))),
                       'wiktionary_regional_pinyin': ' | '.join(unique(item['pinyin'] for item in evidence if item.get('regional'))),
                       'sourced_alternatives': ' | '.join(alternatives), 'reading_comparison': agreement,
                       'source_urls': ' | '.join(unique(item['url'] for item in evidence)),
                       'recording_url': recording['url'] if recording else '',
                       'recording_speaker': recording['speaker'] if recording else '',
                       'recording_license': recording['license'] if recording else '',
                       'recording_validation': recording['validation'] if recording else 'no_match_in_audio_cmn_inventory'})
        output.append(merged)
        provenance.append({'id': row['id'], 'simplified': row['simplified'], 'suppliedPinyin': row['pinyin'],
                           'readings': evidence, 'recording': recording, 'reviewStatus': 'unreviewed_source_comparison',
                           'recordingReadingVerified': False})
    return output, provenance


def clean(text):
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'\s*\((?:idiom|proverb)\)\s*', ' ', text).strip()
    return text


def references():
    cedict = defaultdict(list)
    for line in gzip.decompress(CEDICT.read_bytes()).decode('utf-8').splitlines():
        match = re.match(r'^(\S+) (\S+) \[([^]]+)\] /(.+)/$', line)
        if match:
            record = {'traditional': match[1], 'simplified': match[2], 'pinyin': match[3],
                      'glosses': match[4].split('/')}
            for head in {match[1], match[2]}:
                cedict[head].append(record)
    wiki = defaultdict(list)
    with gzip.open(BASE / 'sources/wiktionary-matched.jsonl.gz', 'rt', encoding='utf-8') as stream:
        for line in stream:
            record = json.loads(line)
            for head in {record['word']} | {row['form'] for row in record.get('forms', []) if row.get('form')}:
                wiki[head].append(record)
    petci = {row['chinese']: row for row in json.loads((BASE / 'sources/petci-raw.json').read_bytes()) if row.get('book')}
    chinese = {row['word']: row for row in json.loads(gzip.decompress((BASE / 'sources/chinese-xinhua-idiom.json.gz').read_bytes()))}
    return cedict, wiki, petci, chinese


def cedict_glosses(head, records, seen=()):
    if head in seen:
        return []
    result = []
    for entry in records.get(head, []):
        for gloss in entry['glosses']:
            link = re.match(r'^(?:variant of|old variant of|see|same as) ([^\s\[]+)', gloss)
            if link:
                for target in link[1].split('|'):
                    result += cedict_glosses(target, records, seen + (head,))
            elif gloss.strip():
                result.append(clean(gloss))
    return unique(result)


def wiki_glosses(head, records, seen=()):
    if not head or head in seen:
        return [], []
    glosses, evidence = [], []
    for entry in records.get(head, []):
        for target in entry.get('redirects', []):
            texts, sources = wiki_glosses(target, records, seen + (head,))
            glosses += texts; evidence += sources
        for sense in entry.get('senses', []):
            links = sense.get('alt_of', []) + sense.get('form_of', [])
            if links:
                for link in links:
                    for target in link['word'].split(' /'):
                        texts, sources = wiki_glosses(target.strip(), records, seen + (head,))
                        glosses += texts; evidence += sources
            elif sense.get('glosses'):
                text = clean(sense['glosses'][-1])
                if text and not re.match(r'^(?:alternative|obsolete|simplified|traditional) (?:form|spelling)', text, re.I):
                    glosses.append(text)
                    evidence.append({'word': entry['word'], 'senseId': sense.get('id'), 'tags': sense.get('tags', [])})
    return unique(glosses), evidence


def build(allow_missing=False):
    rows = read_tsv(ORIGINAL)
    if len(rows) != 8519 or list(rows[0]) != FIELDS:
        raise ValueError('Unexpected original idiom handoff')
    provided = {row['id']: row['meaning_en'] for row in rows if row['meaning_en']}
    if len(provided) != 105:
        raise ValueError('Supplied English baseline changed')
    originals = {row['id']: row for row in rows}
    draft_file = json.loads(DRAFTS.read_bytes()) if DRAFTS.exists() else {'translations': {}}
    if DRAFTS.exists() and draft_file['originalSha256'] != hashlib.sha256(ORIGINAL.read_bytes()).hexdigest():
        raise ValueError('Drafts belong to a different original TSV')
    drafts = {identity: {'id': identity, 'simplified': originals.get(identity, {}).get('simplified'),
                         'meaning_en': text, 'notes': draft_file.get('notesById', {}).get(identity, ''),
                         'sourceUrls': draft_file.get('sourceUrlsById', {}).get(identity, [])}
              for identity, text in draft_file['translations'].items()}
    for identity, draft in drafts.items():
        if identity not in originals or draft['simplified'] != originals[identity]['simplified'] or identity in provided:
            raise ValueError(f'Draft identity mismatch: {identity}')
    cedict, wiki, petci, chinese = references()
    outcomes, pending, counts = [], [], Counter()
    used_drafts = set()
    for original in rows:
        row = dict(original)
        heads = unique([row['simplified'], row['traditional']])
        evidence = {'id': row['id'], 'simplified': row['simplified'], 'reviewStatus': 'unreviewed_translation_draft'}
        if row['meaning_en']:
            evidence.update({'method': 'provided_unchanged', 'reviewStatus': 'provided_unassessed'})
        elif row['id'] in drafts and drafts[row['id']]['meaning_en'].strip():
            draft = drafts[row['id']]
            row['meaning_en'] = draft['meaning_en'].strip()
            evidence.update({'method': 'assistant_draft', 'notes': draft.get('notes', ''),
                             'sourceUrls': draft['sourceUrls'],
                             'chineseReference': chinese.get(row['simplified'], {}).get('explanation'),
                             'chineseReferenceSource': 'sources/chinese-xinhua-idiom.json.gz' if row['simplified'] in chinese else None})
            used_drafts.add(row['id'])
        else:
            dictionary = next(((head, cedict_glosses(head, cedict)) for head in heads if cedict_glosses(head, cedict)), None)
            wiktionary = next(((head, *wiki_glosses(head, wiki)) for head in heads if wiki_glosses(head, wiki)[0]), None) if not dictionary else None
            if dictionary:
                head, meanings = dictionary
                row['meaning_en'] = '; '.join(meanings)
                evidence.update({'method': 'cc_cedict', 'matchedHeadword': head, 'license': 'CC BY-SA 4.0',
                                 'url': 'https://www.mdbg.net/chinese/dictionary?page=worddict&wdqb=' + quote(head),
                                 'sourceEntries': cedict[head]})
            elif wiktionary:
                head, meanings, sources = wiktionary
                row['meaning_en'] = '; '.join(meanings)
                evidence.update({'method': 'wiktionary', 'matchedHeadword': head, 'license': 'CC BY-SA 4.0',
                                 'url': 'https://en.wiktionary.org/wiki/' + quote(head), 'sourceSenses': sources})
            elif row['simplified'] in petci:
                entry = petci[row['simplified']]
                row['meaning_en'] = '; '.join(unique(clean(text) for text in entry['book'] if text.strip()))
                evidence.update({'method': 'petci_dictionary', 'datasetId': entry['id'], 'field': 'book',
                                 'license': 'Apache-2.0', 'url': 'https://github.com/kenantang/petci',
                                 'machineTranslationColumnsUsed': False})
            else:
                evidence['method'] = 'pending'
                pending.append({'id': row['id'], 'simplified': row['simplified'],
                                'chinese_explanation': chinese.get(row['simplified'], {}).get('explanation', '')})
        if any(row[key] != original[key] for key in FIELDS if key != 'meaning_en') or (original['meaning_en'] and row['meaning_en'] != original['meaning_en']):
            raise ValueError(f'Non-English input changed: {row["id"]}')
        if any(char in row['meaning_en'] for char in '\t\r\n'):
            raise ValueError(f'Multiline English cell: {row["id"]}')
        counts[evidence['method']] += 1
        evidence['meaning_en'] = row['meaning_en']
        outcomes.append(evidence)
        original.clear(); original.update(row)
    if used_drafts != {identity for identity, row in drafts.items() if row['meaning_en'].strip()}:
        raise ValueError('Unused translation draft')
    if pending and not allow_missing:
        raise ValueError(f'{len(pending)} English translations still missing')
    def tsv(items, fields):
        stream = io.StringIO(newline='')
        writer = csv.DictWriter(stream, fieldnames=fields, delimiter='\t', lineterminator='\n')
        writer.writeheader(); writer.writerows(items)
        return stream.getvalue()
    source_paths = [ORIGINAL, CEDICT, BASE / 'sources/manifest.json', BASE / 'sources/wiktionary-matched.jsonl.gz',
                    BASE / 'sources/petci-raw.json', BASE / 'sources/chinese-xinhua-idiom.json.gz',
                    BASE / 'sources/audio-cmn-matches.json']
    if DRAFTS.exists(): source_paths.append(DRAFTS)
    pronunciations, reading_evidence = pronunciation_rows(rows, cedict, wiki, chinese)
    audit = {'version': 1, 'rows': len(rows), 'originalEnglishPreserved': len(provided), 'newEnglish': len(rows) - len(provided) - len(pending),
             'missingEnglish': len(pending), 'methods': dict(counts), 'columnsUnchangedExcept': 'meaning_en',
             'newTranslationsVerified': False, 'applicationDataModified': False,
             'pronunciations': {'rows': len(pronunciations), 'suppliedPinyinPreserved': True,
                               'withSourcedReadings': sum(bool(item['readings']) for item in reading_evidence),
                               'withAlternatives': sum(bool(item['sourced_alternatives']) for item in pronunciations),
                               'comparison': dict(Counter(item['reading_comparison'] for item in pronunciations)),
                               'audioCmnExactFileMatches': sum(bool(item['recording']) for item in reading_evidence),
                               'listeningReviewed': 0},
             'inputs': [{'file': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
                         'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in source_paths]}
    return audit, {OUTPUT: tsv(rows, FIELDS), PROVENANCE: ''.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n' for row in outcomes),
                   PRONUNCIATIONS: tsv(pronunciations, list(pronunciations[0])),
                   PRONUNCIATION_EVIDENCE: ''.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n' for row in reading_evidence),
                   PENDING: tsv(pending, ['id', 'simplified', 'chinese_explanation']), AUDIT: json.dumps(audit, ensure_ascii=False, indent=2) + '\n'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--prepare', action='store_true', help='Write available lookups and the remaining draft worklist')
    mode.add_argument('--write', action='store_true'); mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    audit, outputs = build(allow_missing=args.prepare)
    for path, content in outputs.items():
        if args.write or args.prepare:
            path.write_text(content, encoding='utf-8', newline='\n')
        elif not path.exists() or path.read_text('utf-8') != content:
            raise ValueError(f'Stale idiom translation output: {path.name}')
    print(json.dumps({key: value for key, value in audit.items() if key != 'inputs'}, indent=2))


if __name__ == '__main__':
    main()
