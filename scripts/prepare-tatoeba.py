#!/usr/bin/env python3
"""Download checksum-bound official Tatoeba inputs for offline sentence review.

Only public corpus text/metadata is downloaded; audio binaries and browser data
are never written. Raw exports remain local, with URLs/checksums in manifest.json.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import bz2
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
import io
from pathlib import Path
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'importer/data/tatoeba'
EXPORTS = 'https://downloads.tatoeba.org/exports/'
SOURCES = {
    'mandarin': 'per_language/cmn/cmn_sentences_detailed.tsv.bz2',
    'mandarin_tags': 'per_language/cmn/cmn_tags.tsv.bz2',
    'tag_details': 'tags_detailed.tar.bz2',
    'tag_metadata': 'tag_metadata.csv',
    'reviews': 'users_sentences.csv',
    'transcriptions': 'per_language/cmn/cmn_transcriptions.tsv.bz2',
    'mandarin_user_languages': 'per_language/cmn/cmn_user_languages.tsv.bz2',
    'mandarin_english_links': 'per_language/cmn/cmn-eng_links.tsv.bz2',
    'english': 'per_language/eng/eng_sentences_detailed.tsv.bz2',
    'english_tags': 'per_language/eng/eng_tags.tsv.bz2',
    'audio_metadata': 'per_language/cmn/cmn_sentences_with_audio.tsv.bz2',
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def download_sources():
    manifest_path = DEST / 'manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8')) if manifest_path.exists() else {
        'version': 1, 'language': 'cmn', 'source': 'Tatoeba official exports',
        'documentation': 'https://tatoeba.org/en/downloads',
        'textLicense': {'name': 'CC BY 2.0 FR', 'url': 'https://creativecommons.org/licenses/by/2.0/fr/'},
        'audioLicense': 'Per recording; an empty licence does not permit reuse outside Tatoeba.',
        'files': {},
    }
    raw_dir = DEST / 'raw'
    raw_dir.mkdir(parents=True, exist_ok=True)

    def acquire(item):
        key, remote = item
        path = raw_dir / Path(remote).name
        previous = manifest['files'].get(key)
        if path.exists():
            if not previous or digest(path) != previous['sha256'] or path.stat().st_size != previous['bytes']:
                raise ValueError(f'Existing source is untracked or changed: {path.name}')
            return key, previous
        request = urllib.request.Request(EXPORTS + remote, headers={'User-Agent': 'Mandarin-Mastery-source-review/1'})
        temporary = path.with_name(path.name + '.part')
        with urllib.request.urlopen(request, timeout=45) as response, temporary.open('wb') as output:
            expected = response.headers.get('Content-Length')
            count = 0
            while chunk := response.read(1024 * 1024):
                count += len(chunk)
                if count > 180_000_000:
                    raise ValueError('Source exceeds the download size boundary')
                output.write(chunk)
            if not count or (expected is not None and count != int(expected)):
                raise ValueError(f'Incomplete source: {remote}')
            metadata = {'path': path.relative_to(DEST).as_posix(), 'url': EXPORTS + remote,
                        'bytes': count, 'lastModified': response.headers.get('Last-Modified'),
                        'etag': response.headers.get('ETag'),
                        'downloadedAt': datetime.now(timezone.utc).isoformat()}
        metadata['sha256'] = digest(temporary)
        temporary.replace(path)
        print(f'Downloaded {key}: {count:,} bytes', flush=True)
        return key, metadata

    # Independent public downloads only. Record each successful file immediately
    # so interruption is resumable without silently accepting untracked bytes.
    failures = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = [pool.submit(acquire, item) for item in SOURCES.items()]
        for job in as_completed(jobs):
            try:
                key, metadata = job.result()
                manifest['files'][key] = metadata
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
            except Exception as error:
                failures.append(str(error))
    if failures:
        raise ValueError('; '.join(failures))
    return manifest


def tsv(path):
    opener = bz2.open if path.suffix == '.bz2' else open
    with opener(path, 'rt', encoding='utf-8', newline='') as stream:
        yield from csv.reader(stream, delimiter='\t', quoting=csv.QUOTE_NONE)


def null(value):
    return None if value in ('', '\\N', '0000-00-00 00:00:00') else value


def details(rows, language, wanted=None):
    result = {}
    for row in rows:
        if len(row) != 6 or row[1] != language:
            raise ValueError(f'Unexpected {language} sentence format')
        identity = int(row[0])
        if wanted is not None and identity not in wanted:
            continue
        if identity in result:
            raise ValueError('Duplicate sentence identity')
        result[identity] = {'id': identity, 'language': language, 'text': row[2],
                            'contributor': null(row[3]), 'createdAt': null(row[4]),
                            'modifiedAt': null(row[5]), 'url': f'https://tatoeba.org/en/sentences/show/{identity}'}
    return result


def held_tags(tags):
    """Conservative source-mark exclusions, never a generated quality score."""
    excluded = {'archaic', 'obsolete', 'old-fashioned', 'old fashioned', 'unnatural',
                'non-sentence', 'not a sentence', 'incorrect transcription',
                'check', 'change', 'needs native check', 'needs native speaker check',
                'needs native-speaker check', 'possible copyright violation',
                'possible copyright infringement', 'do not translate'}
    return sorted(tag for tag in tags if tag.strip().casefold().startswith('@')
                  or tag.strip().casefold() in excluded)


def marking(sentence, tags, reviews, taggings):
    positive = [row for row in reviews if row['rating'] == 1]
    negative = [row for row in reviews if row['rating'] == -1]
    ok = 'OK' in tags
    holds = []
    if negative:
        holds.append('negative_user_review')
    warnings = held_tags(tags)
    if warnings:
        holds.append('excluded_source_tag')
    current_edit = sentence['modifiedAt']
    dates = [row['modifiedAt'] for row in positive]
    dates += [row['createdAt'] for row in taggings if row['tag'] == 'OK']
    # The exports retain marks after edits. Flag old marks instead of assuming
    # their reviewers checked the current text; unknown dates remain unknown.
    if current_edit and dates and all(date and date < current_edit for date in dates):
        holds.append('all_positive_marks_predate_text_edit')
    return {'okTag': ok, 'positiveReviews': len(positive), 'negativeReviews': len(negative),
            'unsureReviews': sum(row['rating'] == 0 for row in reviews),
            'positiveMarked': bool(ok or positive), 'excludedTags': warnings,
            'holds': holds, 'eligibleForSecondaryReview': bool(ok or positive) and not holds}


def audio_reuse(license_name):
    if not license_name:
        return 'not_permitted_without_separate_permission'
    if '-NC' in license_name.upper():
        return 'noncommercial_terms_only'
    return 'explicit_license_requires_terms_review'


def filter_sources(write=False, check=False):
    manifest = check_sources()
    source_paths = {key: DEST / value['path'] for key, value in manifest['files'].items()}
    mandarin = details(tsv(source_paths['mandarin']), 'cmn')
    links = defaultdict(set)
    for row in tsv(source_paths['mandarin_english_links']):
        if len(row) != 2:
            raise ValueError('Unexpected direct-link format')
        chinese, english = map(int, row)
        if chinese in mandarin:
            links[chinese].add(english)
    linked_english_ids = {identity for group in links.values() for identity in group}
    wanted = mandarin.keys() | linked_english_ids
    reviews = defaultdict(list)
    for row in tsv(source_paths['reviews']):
        if len(row) != 5:
            raise ValueError('Unexpected review format')
        identity = int(row[1])
        if identity in wanted:
            rating = int(row[2])
            if rating not in (-1, 0, 1):
                raise ValueError('Unknown review value')
            reviews[identity].append({'reviewer': null(row[0]), 'rating': rating,
                                      'createdAt': null(row[3]), 'modifiedAt': null(row[4])})
    tags = defaultdict(set)
    orphan_mandarin_tags = []
    for key in ('mandarin_tags', 'english_tags'):
        for row in tsv(source_paths[key]):
            if len(row) != 2:
                raise ValueError('Unexpected tag format')
            identity = int(row[0])
            if key == 'mandarin_tags' and identity not in mandarin:
                orphan_mandarin_tags.append({'sentenceId': identity, 'tag': row[1]})
            if identity in wanted:
                tags[identity].add(row[1])
    marked = {identity for identity in mandarin if 'OK' in tags[identity]
              or any(row['rating'] == 1 for row in reviews[identity])}
    english_ids = {english for identity in marked for english in links[identity]}
    english = details(tsv(source_paths['english']), 'eng', english_ids)
    retained = marked | english_ids
    tag_names = {int(row[0]): row[1] for row in tsv(source_paths['tag_metadata']) if len(row) == 4}
    taggings = defaultdict(list)
    with tarfile.open(source_paths['tag_details'], 'r:bz2') as archive:
        members = archive.getmembers()
        if len(members) != 1 or members[0].name != 'tags_detailed.csv' or not members[0].isfile():
            raise ValueError('Unexpected detailed tag archive')
        with io.TextIOWrapper(archive.extractfile(members[0]), encoding='utf-8', newline='') as stream:
            for row in csv.reader(stream, delimiter='\t', quoting=csv.QUOTE_NONE):
                if len(row) != 4:
                    raise ValueError('Unexpected detailed tag format')
                identity = int(row[1])
                tag = tag_names[int(row[0])]
                if identity in retained and tag in tags[identity]:
                    taggings[identity].append({'tag': tag, 'contributor': null(row[2]), 'createdAt': null(row[3])})
    transcriptions = defaultdict(list)
    for row in tsv(source_paths['transcriptions']):
        if len(row) != 5 or row[1] != 'cmn':
            raise ValueError('Unexpected Mandarin transcription format')
        transcriptions[int(row[0])].append({'script': row[2], 'reviewer': null(row[3]),
                                           'markedReviewed': bool(null(row[3])), 'text': row[4]})
    skills = {}
    for row in tsv(source_paths['mandarin_user_languages']):
        # This upstream field can contain literal newlines in free-text details.
        # Only fully shaped rows with a named user supply prioritization metadata.
        if len(row) >= 4 and row[0] == 'cmn' and row[1].isdigit() and null(row[2]):
            skills[row[2]] = int(row[1])
    audios = defaultdict(list)
    for row in tsv(source_paths['audio_metadata']):
        if len(row) != 5:
            raise ValueError('Unexpected audio metadata format')
        identity = int(row[0])
        audios[identity].append({'audioId': int(row[1]), 'contributor': null(row[2]),
                                'license': null(row[3]), 'attributionUrl': null(row[4]),
                                'downloadUrl': f'https://tatoeba.org/audio/download/{int(row[1])}',
                                'reuseStatus': audio_reuse(row[3]), 'binaryDownloaded': False})

    def annotated(sentence):
        identity = sentence['id']
        return {**sentence, 'license': 'CC BY 2.0 FR', 'tags': sorted(tags[identity]),
                'reviews': reviews[identity], 'taggings': taggings[identity],
                'marking': marking(sentence, tags[identity], reviews[identity], taggings[identity])}

    records = []
    for identity in sorted(marked):
        sentence = annotated(mandarin[identity])
        translations = [annotated(english[target]) for target in sorted(links[identity]) if target in english]
        clean_translations = [row for row in translations if not row['marking']['holds']]
        records.append({**sentence, 'ownerSelfReportedMandarinLevel': skills.get(sentence['contributor']),
                        'positiveReviewersSelfReportedMandarinLevels': {
                            row['reviewer']: skills.get(row['reviewer']) for row in reviews[identity] if row['rating'] == 1},
                        'transcriptions': transcriptions[identity], 'audio': audios.get(identity, []),
                        'englishTranslations': translations, 'directEnglishLinkOnly': True,
                        'readyForBilingualSecondaryReview': sentence['marking']['eligibleForSecondaryReview'] and bool(clean_translations),
                        'secondaryReview': {'status': 'not_started', 'aiReviewed': False,
                                            'targetCharacterReadingsAndSensesChecked': False}})
    selected = [row for row in records if row['marking']['eligibleForSecondaryReview']]
    ok_records = [row for row in records if row['marking']['okTag']]
    positive_reviews = [row for row in records if row['marking']['positiveReviews']]
    recorded_audio_ids = {identity for identity, clips in audios.items() if clips}
    audio_ids = recorded_audio_ids & mandarin.keys()
    audio_rows = [clip for clips in audios.values() for clip in clips]
    audio_with_script = lambda script: sum(any(row['script'] == script for row in transcriptions[identity]) for identity in audio_ids)
    reviewed_audio_pinyin = sum(any(row['script'] == 'Latn' and row['markedReviewed'] for row in transcriptions[identity]) for identity in audio_ids)

    # Report exact written-form coverage only; neither normalization nor pinyin
    # synthesis is allowed to turn this into a reading/sense review.
    ids_path = ROOT / 'public/data/catalog_ids.json'
    catalog_ids = json.loads(ids_path.read_text('utf-8'))['characters']
    from vocabulary_store import read_vocabulary
    vocabulary = read_vocabulary(ROOT / 'src/data/vocabulary')['entries']
    existing = set(''.join(example['simplified'] for entry in vocabulary for example in entry['examples']))
    fallbacks = json.loads((ROOT / 'public/data/character-hsk-examples.json').read_text('utf-8'))['examples']
    existing.update(example['character'] for example in fallbacks.values())
    new_occurrences = (set(''.join(row['text'] for row in selected)) & catalog_ids.keys()) - existing
    bilingual = [row for row in selected if row['readyForBilingualSecondaryReview']]
    bilingual_occurrences = (set(''.join(row['text'] for row in bilingual)) & catalog_ids.keys()) - existing
    audio_summary = {
        'recordingRows': len(audio_rows), 'distinctSentenceIdsInAudioExport': len(recorded_audio_ids),
        'sentencesPresentInCurrentMandarinExport': len(audio_ids),
        'audioIdsAbsentFromCurrentSentenceExport': sorted(recorded_audio_ids - mandarin.keys()),
        'licenseCounts': dict(Counter(clip['license'] or '(not supplied)' for clip in audio_rows)),
        'recordingsWithExplicitLicense': sum(bool(clip['license']) for clip in audio_rows),
        'recordingsPermittedForCommercialReuseByListedLicense': sum(bool(clip['license']) and '-NC' not in clip['license'].upper() for clip in audio_rows),
        'audioSentencesWithExportedPinyin': audio_with_script('Latn'),
        'audioSentencesWithReviewedPinyin': reviewed_audio_pinyin,
        'audioSentencesWithExportedHansConversion': audio_with_script('Hans'),
        'audioSentencesWithExportedHantConversion': audio_with_script('Hant'),
        'conversionNote': 'Hans/Hant are alternative-script conversions, not independently proofread parallel originals. A named pinyin reviewer is a separate mark from sentence OK.',
        'audioBinariesDownloaded': 0,
    }
    summary = {
        'source': 'Official Tatoeba exports', 'language': 'cmn',
        'sourceSnapshot': {key: {'url': row['url'], 'lastModified': row['lastModified'], 'sha256': row['sha256']} for key, row in sorted(manifest['files'].items())},
        'policy': {'positiveOnly': 'Exact OK tag OR at least one user rating +1; no unmarked sentences are candidates.',
                   'held': 'Negative ratings, attention tags beginning @, archaic/native-check/correction tags, or all dated positive marks predating the last text edit.',
                   'english': 'Direct Mandarin–English links only. Retain translation evidence separately; an English positive mark does not certify Mandarin and vice versa.',
                   'review': 'Metadata filtering only; no AI/native/reading/sense certification. Self-reported Mandarin level is prioritization metadata, not a trusted-contributor certificate.'},
        'counts': {'mandarinSentences': len(mandarin), 'okTaggedMandarin': len(ok_records),
                   'positivelyRatedMandarin': len(positive_reviews),
                   'bothOkTaggedAndPositivelyRated': sum(row['marking']['okTag'] and bool(row['marking']['positiveReviews']) for row in records),
                   'distinctPositiveMarked': len(records), 'heldPositiveMarked': len(records) - len(selected),
                   'eligiblePositiveMarked': len(selected),
                   'eligibleOkTagged': sum(row['marking']['okTag'] for row in selected),
                   'eligibleWithCleanDirectEnglish': len(bilingual),
                   'eligibleWithPositivelyMarkedCleanDirectEnglish': sum(any(t['marking']['eligibleForSecondaryReview'] for t in row['englishTranslations']) for row in selected),
                   'eligibleWithAudioMetadata': sum(bool(row['audio']) for row in selected),
                   'audioRecordingsOnEligibleCandidates': sum(len(row['audio']) for row in selected),
                   'explicitlyLicensedAudioRecordingsOnEligibleCandidates': sum(bool(clip['license']) for row in selected for clip in row['audio']),
                   'eligibleWithReviewedPinyin': sum(any(t['script'] == 'Latn' and t['markedReviewed'] for t in row['transcriptions']) for row in selected),
                   'possibleAdditionalCharactersByExactOccurrence': len(new_occurrences),
                   'possibleAdditionalCharactersWithCleanDirectEnglish': len(bilingual_occurrences)},
        'holds': dict(Counter(reason for row in records for reason in row['marking']['holds'])),
        'excludedTagsOnPositiveMarked': dict(Counter(tag for row in records for tag in row['marking']['excludedTags'])),
        'orphanMandarinTags': orphan_mandarin_tags, 'audio': audio_summary,
        'eligibleAudioLicenseCounts': dict(Counter(clip['license'] or '(not supplied)' for row in selected for clip in row['audio'])),
        'possibleAdditionalCharacters': ''.join(sorted(new_occurrences)),
    }
    outputs = {}
    # Bounded parts keep every review record intact and stay below the repo's
    # 10 MB file limit. IDs/order/source strings are preserved, never deduplicated by text.
    parts = []; chunk = []; part = 1; byte_count = 0
    for row in records:
        line = json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n'
        size = len(line.encode('utf-8'))
        if chunk and byte_count + size > 5_000_000:
            name = f'marked-{part:03}.jsonl'; outputs[DEST / 'selected' / name] = ''.join(chunk); parts.append(name)
            chunk = []; part += 1; byte_count = 0
        chunk.append(line); byte_count += size
    if chunk:
        name = f'marked-{part:03}.jsonl'; outputs[DEST / 'selected' / name] = ''.join(chunk); parts.append(name)
    summary['parts'] = parts
    for filename, rows in [('ok-tagged.tsv', ok_records),
                           ('ok-candidates.tsv', [row for row in selected if row['marking']['okTag']]),
                           ('positive-candidates.tsv', selected)]:
        stream = io.StringIO(newline='')
        writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(['sentence_id', 'contributor', 'chinese', 'pinyin_as_exported', 'direct_english', 'OK_tag', 'positive_reviews', 'holds', 'audio_recordings', 'owner_self_reported_cmn_level', 'pinyin_marked_reviewed', 'ready_for_bilingual_secondary_review', 'sentence_url'])
        for row in rows:
            writer.writerow([row['id'], row['contributor'] or '', row['text'],
                             ' | '.join(t['text'] for t in row['transcriptions'] if t['script'] == 'Latn'),
                             ' | '.join(t['text'] for t in row['englishTranslations']), row['marking']['okTag'],
                             row['marking']['positiveReviews'], ', '.join(row['marking']['holds']),
                             len(row['audio']), row['ownerSelfReportedMandarinLevel'],
                             any(t['script'] == 'Latn' and t['markedReviewed'] for t in row['transcriptions']),
                             row['readyForBilingualSecondaryReview'], row['url']])
        outputs[DEST / 'selected' / filename] = stream.getvalue()
    outputs[ROOT / 'reports/tatoeba-positive-inventory.json'] = json.dumps(summary, ensure_ascii=False, indent=2) + '\n'
    counts = summary['counts']
    export_dates = sorted({parsedate_to_datetime(row['lastModified']).strftime('%d %B %Y')
                           for row in manifest['files'].values() if row['lastModified']})
    license_description = '; '.join(f"{amount:,} with {name}" for name, amount in audio_summary['licenseCounts'].items())
    candidate_license_description = '; '.join(f"{amount:,} with {name}" for name, amount in summary['eligibleAudioLicenseCounts'].items())
    outputs[ROOT / 'reports/tatoeba-positive-inventory.md'] = f"""# Tatoeba positive Mandarin inventory

Source: [official Tatoeba exports](https://tatoeba.org/en/downloads), language
**cmn**. Export file dates in this snapshot: {', '.join(export_dates)}.
Exact URLs, timestamps and SHA-256 hashes are in the
[source manifest](../importer/data/tatoeba/manifest.json).

| Inventory | Sentences |
| --- | ---: |
| Current Mandarin source records | {counts['mandarinSentences']:,} |
| Exact OK tag | {counts['okTaggedMandarin']:,} |
| At least one +1 user rating | {counts['positivelyRatedMandarin']:,} |
| Both | {counts['bothOkTaggedAndPositivelyRated']:,} |
| Distinct positively marked | {counts['distinctPositiveMarked']:,} |
| Held after exclusions | {counts['heldPositiveMarked']:,} |
| Eligible positive candidates | {counts['eligiblePositiveMarked']:,} |
| Eligible exact-OK candidates | {counts['eligibleOkTagged']:,} |
| Eligible with an unflagged direct English translation | {counts['eligibleWithCleanDirectEnglish']:,} |

Start with [ok-candidates.tsv](../importer/data/tatoeba/selected/ok-candidates.tsv).
The broader working set is
[positive-candidates.tsv](../importer/data/tatoeba/selected/positive-candidates.tsv).
[All OK-tagged records](../importer/data/tatoeba/selected/ok-tagged.tsv) retain
their holds. Full evidence is in the bounded JSONL parts described in the
[review directory](../importer/data/tatoeba/selected/README.md).

Only positive source marks enter this inventory. Negative ratings, archaic,
native-check/correction/attention tags and entirely stale positive evidence are
held. Hold reasons can overlap. One OK tag points to an ID absent from the
current Mandarin text export and is recorded separately, not admitted.
Contributor Mandarin levels are self-reported and never a trust certificate.

No secondary AI or native-speaker review has run. Mandarin OK does not certify
its translation, pinyin, audio, teaching suitability or a target character sense.
Exact text occurrence offers potential coverage for
**{counts['possibleAdditionalCharactersWithCleanDirectEnglish']:,} additional character records**
with direct English; this is not an approved character/example assignment.

## Audio claim check

The [official audio page](https://tatoeba.org/en/audio/index/cmn) and downloaded
metadata show **{audio_summary['recordingRows']:,} recordings**, not 1,747.
This snapshot has one recording per ID; one audio ID is absent from the current
text export, leaving {audio_summary['sentencesPresentInCurrentMandarinExport']:,}
joinable sentences. All of those have exported pinyin and an alternative Hans or
Hant conversion. Only {audio_summary['audioSentencesWithReviewedPinyin']:,} have
a named pinyin reviewer. Script conversions are not independently proofread
parallel originals.

Audio licence metadata: **{license_description}**. Tatoeba's export documentation
says an empty audio licence does not permit reuse outside Tatoeba.
Of our positive working candidates,
{counts['eligibleWithAudioMetadata']:,} have audio metadata and only
{counts['explicitlyLicensedAudioRecordingsOnEligibleCandidates']} recordings have
an explicit licence. Candidate audio licences: {candidate_license_description}.
Licence conditions, including any noncommercial restriction, remain attached.
No audio binaries were downloaded.

Nothing was imported into the app. Reproduce/check with
`python scripts/prepare-tatoeba.py --filter --check`; boundary and snapshot tests:
`python scripts/prepare-tatoeba.test.py`.
"""
    for path, text in outputs.items():
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding='utf-8', newline='\n')
        elif check and (not path.exists() or path.read_text('utf-8') != text):
            raise ValueError(f'Stale output: {path.relative_to(ROOT)}')
    print(json.dumps({'counts': summary['counts'], 'holds': summary['holds'], 'audio': audio_summary}, indent=2))
    return summary


def check_sources():
    manifest = json.loads((DEST / 'manifest.json').read_text('utf-8'))
    if manifest['language'] != 'cmn' or set(manifest['files']) != set(SOURCES):
        raise ValueError('Incomplete or wrong-language snapshot')
    for key, metadata in manifest['files'].items():
        path = DEST / metadata['path']
        if metadata['url'] != EXPORTS + SOURCES[key] or path.stat().st_size != metadata['bytes'] or digest(path) != metadata['sha256']:
            raise ValueError(f'Source checksum/identity mismatch: {key}')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--filter', action='store_true', help='Identify positive marks and generate review candidates')
    parser.add_argument('--write', action='store_true', help='Write derived candidate files/report, never application data')
    args = parser.parse_args()
    if args.download:
        download_sources()
    if args.check:
        manifest = check_sources()
        print(f"Verified {len(manifest['files'])} official source files.")
    if args.filter:
        filter_sources(write=args.write, check=args.check)
    if args.write and not args.filter:
        parser.error('--write requires --filter')
    if not (args.download or args.check or args.filter):
        parser.error('Choose --download, --filter or --check')


if __name__ == '__main__':
    main()
