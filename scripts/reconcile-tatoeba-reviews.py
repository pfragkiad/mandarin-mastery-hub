#!/usr/bin/env python3
"""Check the supplied consecutive reviews and prepare the owner's OK Batch 1 report.

Original report/source bytes stay unchanged. Reviewer 2 overrides returned rows;
non-returned rows accept Reviewer 1 per the owner's explicit instruction. Draft
corrections never approve or import application content.
"""
import argparse
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'importer/data/tatoeba/reports'
REVIEW_FILES = ['tatoeba-quality-report.-batch1.tsv', 'tatoeba-quality-report-reviewer2-batch1.tsv']
FIELDS = ['id', 'character', 'sentence', 'translation']
REVIEW_FIELDS = ['zh_script', 'zh_quality_score', 'zh_quality_rating', 'zh_issues',
                 'en_quality_score', 'en_quality_rating', 'en_issues', 'overall_status', 'review_notes']
ROUND3_FILE = 'batch1-final-report-part-01-round3-review.tsv'
ROUND3_FIELDS = ['round3_notes', 'round3_suggested_sentence', 'round3_suggested_translation']


def validate_round3(reviewed, submitted):
    """Bind the returned Part 1 review to its exact original/proposed wording.

    Only the Round 3 decision and added feedback columns may change. A review
    of one part never supplies decisions for other character-specific rows.
    """
    keyed(reviewed)
    if [row['id'] for row in reviewed] != [row['id'] for row in submitted]:
        raise ValueError('Round 3 must cover exactly Part 1 in submitted order')
    for row, source in zip(reviewed, submitted):
        if set(row) != set(source) | set(ROUND3_FIELDS):
            raise ValueError(f'Unexpected Round 3 schema: {row["id"]}')
        if any(row[field] != value for field, value in source.items() if field != 'round3_status'):
            raise ValueError(f'Round 3 changed carried source/proposal fields: {row["id"]}')
        if row['round3_status'] not in ('Pass', 'Minor_Review', 'Needs_Fix'):
            raise ValueError(f'Unknown Round 3 status: {row["id"]}')
        if not row['round3_suggested_translation'] or row['character'] not in row['round3_suggested_sentence']:
            raise ValueError(f'Round 3 proposal loses translation/target: {row["id"]}')
    pairs = {}
    for row in reviewed:
        pair = ':'.join(row['id'].split(':')[:3])
        decision = tuple(row[field] for field in ['round3_status'] + ROUND3_FIELDS)
        if pair in pairs and pairs[pair] != decision:
            raise ValueError(f'Inconsistent Round 3 feedback for repeated pair: {pair}')
        pairs[pair] = decision
    return keyed(reviewed)


def read_tsv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream, delimiter='\t')
        rows = list(reader)
    if not rows or any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError(f'Empty or malformed TSV: {path.name}')
    return rows


def keyed(rows):
    result = {row['id']: row for row in rows}
    if len(result) != len(rows):
        raise ValueError('Duplicate review IDs')
    return result


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def validate_review(rows, originals):
    review = keyed(rows)
    for identity, row in review.items():
        if set(row) != set(FIELDS + REVIEW_FIELDS) or identity not in originals:
            raise ValueError(f'Unknown identity or review schema: {identity}')
        if any(row[field] != originals[identity][field] for field in FIELDS):
            raise ValueError(f'Review changed original identity/text: {identity}')
        if row['overall_status'] not in ('Pass', 'Minor_Review', 'Needs_Fix'):
            raise ValueError(f'Unknown review status: {identity}')
        if any(row[field] not in ('1', '2', '3', '4', '5') for field in ('zh_quality_score', 'en_quality_score')):
            raise ValueError(f'Invalid supplied score: {identity}')
    return review


def proposal_for(original, proposal):
    sentence = proposal.get('sentence', original['sentence'])
    for before, after in proposal.get('sentenceReplacements', []):
        if before not in sentence:
            raise ValueError(f'Proposal replacement does not match: {original["id"]}')
        sentence = sentence.replace(before, after)
    translation = proposal.get('translation', original['translation'])
    if original['character'] not in sentence:
        raise ValueError(f'Proposal removes the exact target: {original["id"]}')
    return sentence, translation


def split_report(text, part_count=4):
    """Small complete review chunks for clients that truncate long TSV previews.

    CSV parsing preserves quoted tabs/newlines; repeating the full header never
    drops columns or splits a record. The ZIP uses fixed metadata for reproducibility.
    """
    parsed = list(csv.reader(io.StringIO(text), delimiter='\t'))
    header, records = parsed[0], parsed[1:]
    rows_per_part = (len(records) + part_count - 1) // part_count
    outputs = {}
    index = ['# Complete Batch 1 report — numbered parts', '',
             f'All **{len(records)} records** from the full report, in original order.',
             'Each part repeats every column, including all returned reviewer notes and proposed corrections.',
             'Read or submit one part at a time. No middle rows have been omitted.', '',
             '| Part | Full-report record range | Records |', '| --- | --- | ---: |']
    archive_files = {'batch1-review-report.tsv': text.encode('utf-8')}
    for start in range(0, len(records), rows_per_part):
        group = records[start:start + rows_per_part]
        number = start // rows_per_part + 1
        name = f'batch1-review-report-part-{number:02}.tsv'
        stream = io.StringIO(newline='')
        writer = csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(header); writer.writerows(group)
        value = stream.getvalue()
        outputs[DIRECTORY / 'batch1-review-report-parts' / name] = value
        archive_files[f'batch1-review-report-parts/{name}'] = value.encode('utf-8')
        index.append(f'| [{number:02}]({name}) | {start + 1}–{start + len(group)} | {len(group)} |')
    index += ['', 'Record ranges exclude the header. Keep IDs unchanged when returning feedback.', '',
              'Purpose/consumer: external reviewers and text viewers; generated by',
              '`python scripts/reconcile-tatoeba-reviews.py --write`, checked with `--check`.',
              'Round 3 feedback is recorded where returned; other rows remain pending.',
              'Proposed wording remains separate from content approval.', '',
              'The [complete original TSV](../batch1-review-report.tsv) and',
              '[complete ZIP](../batch1-review-report-complete.zip) remain available.', '']
    readme = '\n'.join(index)
    outputs[DIRECTORY / 'batch1-review-report-parts/README.md'] = readme
    archive_files['batch1-review-report-parts/README.md'] = readme.encode('utf-8')
    compressed = io.BytesIO()
    with zipfile.ZipFile(compressed, 'w') as archive:
        for name, raw in sorted(archive_files.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            archive.writestr(info, raw, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    outputs[DIRECTORY / 'batch1-review-report-complete.zip'] = compressed.getvalue()
    return outputs


def build():
    original = keyed(read_tsv(ROOT / 'reports/tatoeba-translation-review.tsv'))
    batch = read_tsv(ROOT / 'reports/tatoeba-chinese-english-review-01-ok.tsv')
    first, second = [validate_review(read_tsv(DIRECTORY / name), original) for name in REVIEW_FILES]
    if set(first) != set(original) or not set(second) <= set(first):
        raise ValueError('First review must cover the full handoff; second must be its subset')
    proposals_file = json.loads((DIRECTORY / 'batch1-suggested-corrections.json').read_bytes())
    proposals = proposals_file['proposals']
    rows = []
    used_proposals = set()
    for source in batch:
        identity = source['id']
        if source != original[identity]:
            raise ValueError('OK batch source mismatch')
        r1, r2 = first[identity], second.get(identity)
        latest = r2 or r1
        pair = ':'.join(identity.split(':')[:3])
        if latest['overall_status'] != 'Pass' and pair not in proposals:
            raise ValueError(f'Missing proposed action for flagged pair: {pair}')
        flagged = latest['overall_status'] != 'Pass'
        proposal = proposals[pair] if flagged else {'action': 'retain_source', 'note': 'Carry forward unchanged for round 3; supplied review status is Pass.'}
        if flagged:
            used_proposals.add(pair)
        suggested_zh, suggested_en = proposal_for(source, proposal)
        rows.append({**source,
            'binding': {'chineseSentenceId': int(identity.split(':')[1]), 'englishSentenceId': int(identity.split(':')[2]),
                        'originalChineseSha256': sha(source['sentence']), 'originalEnglishSha256': sha(source['translation']),
                        'proposedChineseSha256': sha(suggested_zh), 'proposedEnglishSha256': sha(suggested_en)},
            'reviewer1': {field: r1[field] for field in REVIEW_FIELDS},
            'reviewer2': {field: r2[field] for field in REVIEW_FIELDS} if r2 else None,
            'reviewer2Disposition': 'returned_override' if r2 else 'accepted_reviewer1_by_owner_instruction',
            'effectiveStatus': latest['overall_status'],
            'effectiveChineseIssues': latest['zh_issues'], 'effectiveEnglishIssues': latest['en_issues'],
            'display': {'marker': 'source_info' if latest['overall_status'] == 'Pass' else 'warning_triangle',
                        'scope': 'recorded_review_findings', 'proposalApproved': False},
            'proposal': {'sentence': suggested_zh, 'translation': suggested_en, 'action': proposal['action'],
                         'note': proposal['note'], 'evidenceUrls': proposal.get('evidenceUrls', []),
                         'targetRetained': True, 'authorship': 'assistant_draft' if flagged else 'unchanged_source',
                         'reviewStatus': 'pending_round_3'},
        })
    if used_proposals != set(proposals):
        raise ValueError('Correction file includes proposals outside the requested OK batch')
    counts = dict(Counter(row['effectiveStatus'] for row in rows))
    source_files = [{ 'file': name, 'bytes': (DIRECTORY / name).stat().st_size,
                      'sha256': hashlib.sha256((DIRECTORY / name).read_bytes()).hexdigest(),
                      'rows': len(first if index == 0 else second)} for index, name in enumerate(REVIEW_FILES)]
    summary = {
        'scope': '375 exact-OK first candidates; no positive-only Batch 2 rows.',
        'policy': 'Returned Reviewer 2 rows override Reviewer 1; non-returned rows accept Reviewer 1, including all flags. Approval of reviewer findings is not approval of draft corrections.',
        'sources': source_files,
        'counts': {'rows': len(rows), 'distinctSourcePairs': len({':'.join(row['id'].split(':')[:3]) for row in rows}),
                   'reviewer2ReturnedInThisBatch': sum(row['reviewer2'] is not None for row in rows),
                   'acceptedReviewer1InThisBatch': sum(row['reviewer2'] is None for row in rows),
                   'effectiveStatus': counts, 'flaggedDistinctPairs': len(proposals),
                   'proposedChineseEdits': sum(row['proposal']['sentence'] != row['sentence'] for row in rows),
                   'proposedEnglishEdits': sum(row['proposal']['translation'] != row['translation'] for row in rows),
                   'allProposalsRetainTarget': all(row['character'] in row['proposal']['sentence'] for row in rows)},
        'finalContentDecision': 'pending_another_review_round', 'rows': rows,
    }
    columns = FIELDS + ['reviewer1_status', 'reviewer2_status', 'reviewer2_disposition', 'effective_status',
                         'chinese_issues', 'english_issues', 'suggested_sentence', 'suggested_translation',
                         'proposal_action', 'proposal_note', 'reviewer1_notes', 'reviewer2_notes', 'round3_status']
    stream = io.StringIO(newline=''); writer = csv.DictWriter(stream, fieldnames=columns, delimiter='\t', lineterminator='\n')
    writer.writeheader()
    next_stream = io.StringIO(newline=''); next_writer = csv.writer(next_stream, delimiter='\t', lineterminator='\n'); next_writer.writerow(FIELDS)
    for row in rows:
        proposal = row['proposal']; r1 = row['reviewer1']; r2 = row['reviewer2']
        writer.writerow({**{field: row[field] for field in FIELDS},
            'reviewer1_status': r1['overall_status'], 'reviewer2_status': r2['overall_status'] if r2 else '',
            'reviewer2_disposition': row['reviewer2Disposition'], 'effective_status': row['effectiveStatus'],
            'chinese_issues': row['effectiveChineseIssues'], 'english_issues': row['effectiveEnglishIssues'],
            'suggested_sentence': proposal['sentence'], 'suggested_translation': proposal['translation'],
            'proposal_action': proposal['action'], 'proposal_note': proposal['note'],
            'reviewer1_notes': r1['review_notes'], 'reviewer2_notes': r2['review_notes'] if r2 else '', 'round3_status': 'pending'})
        next_writer.writerow([row['id'], row['character'], proposal['sentence'], proposal['translation']])
    # Validate against the original handoff schema before adding new output columns.
    submitted = list(csv.DictReader(io.StringIO(stream.getvalue()), delimiter='\t'))
    reviewed = read_tsv(DIRECTORY / ROUND3_FILE)
    third = validate_round3(reviewed, submitted[:(len(submitted) + 3) // 4])
    source_path = DIRECTORY / ROUND3_FILE
    summary['sources'].append({'file': ROUND3_FILE, 'bytes': source_path.stat().st_size,
                              'sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(), 'rows': len(third)})
    round3_counts = dict(Counter(row['round3_status'] for row in reviewed))
    shared_pairs = {':'.join(row['id'].split(':')[:3]) for row in reviewed}
    pending_shared = [row['id'] for row in rows if row['id'] not in third and ':'.join(row['id'].split(':')[:3]) in shared_pairs]
    summary['counts']['round3'] = {
        'returned': len(third), 'pending': len(rows) - len(third), 'status': round3_counts,
        'distinctSourcePairs': len(shared_pairs),
        'suggestedChineseEdits': sum(row['round3_suggested_sentence'] != row['suggested_sentence'] for row in reviewed),
        'suggestedEnglishEdits': sum(row['round3_suggested_translation'] != row['suggested_translation'] for row in reviewed),
        'unreturnedRowsSharingReviewedPairs': len(pending_shared),
    }
    summary['round3Policy'] = ('Part 1 returned decisions are recorded against the exact submitted proposal. '
                               'Unreturned rows remain pending; Reviewer 2 inheritance does not apply to Round 3. '
                               'Reviewer suggestions and Pass decisions do not constitute owner content approval.')
    summary['round3PendingSharedPairIds'] = pending_shared
    summary['finalContentDecision'] = 'pending_owner_decision_and_remaining_round3_reviews'
    output_stream = io.StringIO(newline='')
    output_writer = csv.DictWriter(output_stream, fieldnames=columns + ROUND3_FIELDS + ['latest_returned_status'],
                                   delimiter='\t', lineterminator='\n')
    output_writer.writeheader()
    for row, report_row in zip(rows, submitted):
        feedback = third.get(row['id'])
        row['reviewer3'] = ({field: feedback[field] for field in ['round3_status'] + ROUND3_FIELDS} if feedback else None)
        if feedback:
            row['binding']['reviewer3SuggestedChineseSha256'] = sha(feedback['round3_suggested_sentence'])
            row['binding']['reviewer3SuggestedEnglishSha256'] = sha(feedback['round3_suggested_translation'])
        row['reviewer3Disposition'] = 'returned_part_1' if feedback else 'pending_not_returned'
        row['latestReturnedStatus'] = feedback['round3_status'] if feedback else row['effectiveStatus']
        row['display']['marker'] = 'source_info' if row['latestReturnedStatus'] == 'Pass' else 'warning_triangle'
        row['display']['round3Pending'] = feedback is None
        row['proposal']['reviewStatus'] = 'round3_feedback_returned_pending_owner_decision' if feedback else 'pending_round_3'
        report_row.update({field: feedback[field] if feedback else '' for field in ROUND3_FIELDS})
        report_row['round3_status'] = feedback['round3_status'] if feedback else 'pending'
        report_row['latest_returned_status'] = row['latestReturnedStatus']
        output_writer.writerow(report_row)
    stream = output_stream
    flagged_pairs = {}
    for feedback in reviewed:
        if feedback['round3_status'] != 'Pass':
            pair = ':'.join(feedback['id'].split(':')[:3])
            flagged_pairs.setdefault(pair, []).append(feedback)
    audit = ['# Batch 1 Round 3 review check', '',
             '**Partial review; content remains under review.**', '',
             f'The new supplied file `{ROUND3_FILE}` covers exactly Part 1: **{len(third)} of {len(rows)} rows** '
             f'({len(shared_pairs)} distinct Chinese/English source pairs). All IDs, order, original text, prior findings '
             'and submitted suggestions match. No duplicate IDs or target-character loss were found. '
             'Repeated pairs receive consistent returned feedback.', '',
             f'**81 Pass, 12 Minor Review, 1 Needs Fix; {len(rows) - len(third)} rows await Round 3.** '
             'These are character-specific row counts, not distinct sentence counts. '
             'The absence rule authorized for Reviewer 2 is not applied to this new round.', '',
             'The reviewer proposes 1 additional Chinese edit and 10 additional English edits relative '
             'to the submitted suggestions. Original wording and both proposal versions stay separate. '
             'Even a Pass may include optional polish; it is not automatic approval of replacement text.', '',
             '## Returned cases still flagged', '']
    for group in flagged_pairs.values():
        feedback = group[0]
        audit += [f'- **{", ".join(item["character"] for item in group)} - {feedback["round3_status"]}** '
                  f'(`{feedback["id"].rsplit(":", 1)[0]}`): {feedback["round3_notes"]}']
    audit += ['', '## Interpretation and remaining work', '',
              '- The Biden sentence has a concrete pronoun/referent mismatch: the Chinese says "with me"; '
              'the English refers to the people he grew up with. The reviewer proposes changing the Chinese '
              'to "with them". This remains a draft correction, with the original preserved.',
              '- Claims about Columbus history and English register are supplied reviewer observations, '
              'not independently verified historical or usage findings. The Columbus question remains flagged '
              'for context and suitability even after aligning its English.',
              '- The reviewer prefers preserving "Mama had". Chinese here does not explicitly mark tense; '
              'neither English tense is certified by the isolated Chinese. Retain the uncertainty for the owner.',
              f'- {len(pending_shared)} unreturned rows share source pairs with reviewed rows. Their exact IDs are '
              'listed in `batch1-review-chain.json` under `round3PendingSharedPairIds`. Keep wording consistent '
              'when reviewed; no Round 3 rating has been copied to those IDs.',
              '- Earlier `effective_status` columns retain the Reviewer 1/2 result. `round3_status` records '
              'only this returned review; `latest_returned_status` selects the most recent available finding. '
              'Unreturned rows keep an explicit pending marker in the structured history.',
              '- No sentence, translation, pinyin or recording has been imported into the application.', '',
              'See [the consolidated review report](batch1-review-report.md), '
              '[four complete parts](batch1-review-report-parts/README.md) and '
              '[preserved input file](batch1-final-report-part-01-round3-review.tsv).', '']
    round3_audit = '\n'.join(audit)
    markdown = f"""# Batch 1 — consolidated report and proposed corrections

**Status: Round 3 partially returned. Content remains under review.**

Round 3 covers Part 1 only: **94 rows: 81 Pass, 12 Minor Review, 1 Needs Fix**.
The other **281 rows remain pending Round 3**. See the
[Round 3 check and unresolved cases](batch1-round3-review-check.md).
Both versions of suggested wording and all supplied decisions are preserved.

This report covers the **{len(rows)} exact-OK first candidates** (220 source
sentence pairs), the owner's “super OK” batch. The input file called
`tatoeba-quality-report.-batch1.tsv` actually reviews all {len(first):,} original
candidates; Reviewer 2 returns {len(second)} rows across that larger set. Only
the 375-row OK subset is included in the output here.

| Reviewer 1/2 decision before Round 3 | Rows |
| --- | ---: |
| Pass | {counts.get('Pass', 0)} |
| Minor Review | {counts.get('Minor_Review', 0)} |
| Needs Fix | {counts.get('Needs_Fix', 0)} |

Reviewer 2 overrides the {summary['counts']['reviewer2ReturnedInThisBatch']} returned rows in this subset.
The other {summary['counts']['acceptedReviewer1InThisBatch']} rows accept Reviewer 1's exact findings under
the owner's instruction, including unresolved flags. These are not independent
double-pass claims. Original scores, issue labels and notes remain preserved.

## Files for the next reviewer

- [Full report with originals, decisions and proposed corrections](batch1-review-report.tsv):
  all 375 rows, all returned review histories and separate suggested Chinese/English.
- [Four numbered parts](batch1-review-report-parts/README.md) and
  [complete ZIP download](batch1-review-report-complete.zip): use these when a
  viewer truncates the full TSV. Every column and record is retained.
- [Minimal Round 3 submission](batch1-next-review.tsv): exactly `id`, `character`,
  `sentence`, `translation`, preserving the pre-Round-3 assistant proposals.
  New reviewer suggestions appear separately in the full comparison report.
- [Structured review-chain metadata](batch1-review-chain.json): exact original
  and proposed text hashes, provenance, scoped findings and source/warning markers.
- [Editable draft proposals](batch1-suggested-corrections.json): {len(proposals)}
  distinct flagged sentence pairs covering 67 rows. Proposals are assistant-authored
  drafts. Part 1 now has separate Round 3 feedback; remaining parts await review.

The 308 Pass rows carry their source wording forward. Proposed Chinese edits
affect {summary['counts']['proposedChineseEdits']} rows and proposed English edits affect
{summary['counts']['proposedEnglishEdits']} rows; these counts overlap.
Every proposed sentence retains its exact target character. Original Tatoeba
Chinese/English and all three supplied report files are unchanged.

## Corrections and decisions to check closely

- **Columbus (托、伦、弗):** the Chinese asks why he divorced; the English asks
  what he discovered. The proposed English follows the recorded divorce question.
  Confirm the intended topic and whether to keep the candidate at all.
- **Uyghur count (吾):** change two thousand to **twenty thousand** to match 两万.
  The source statement is not a current corpus-count assertion.
- **揉:** remove the unsupported English addition “and mending”.
- **國際歌 (徵、際、譯、爭、鬥):** repair the English and identify the song as
  *The Internationale*. [MOE song entry](https://dict.revised.moe.edu.tw/dictView.jsp?ID=72189&la=1&powerMode=0).
- **麽、蕃:** retain the target forms with a variant/register note. Replacing them
  with 麼/番 would erase the intended target. MOE records
  [麽 as a variant](https://dict.revised.moe.edu.tw/dictView.jsp?ID=26831&la=0&powerMode=0)
  and lists [蕃茄 in its vocabulary appendix](https://dict.concised.moe.edu.tw/appendix.jsp?AID=92016&ID=54&SN=%E3%84%88&la=0&powerMode=0&word=%E8%B2%A0%E6%88%90%E9%95%B7).
- **被單 (媽):** quilt cover is a provisional proposed sense. MOE records
  [several meanings](https://pedia.cloud.edu.tw/Entry/Detail/?search=%E8%A2%AB%E5%96%AE&title=%E8%A2%AB%E5%96%AE);
  confirm context rather than treating the reviewer label as definitive.
- **残、暧/昧、顆/記、專:** proposals still need context or phrasing decisions;
  the proposal notes state what remains uncertain. No missing referent was invented.
- Punctuation/spacing proposals are presentation edits; they do not establish a
  grammar error. The proposed middle dot in a personal name is optional.

## Next-round instructions

Review **both Chinese naturalness/grammar and English fidelity**. Keep IDs and
target characters unchanged. The minimal TSV contains draft editorial wording,
not a verbatim Tatoeba export. Return corrections/decisions keyed by ID and state
whether an issue affects Chinese, English or context. Repeated sentence pairs
should receive consistent wording while retaining every character-specific ID.
Pinyin, audio and intended dictionary reading/sense remain outside this review.
Nothing is imported into the app or marked finally approved.

Regenerate: `python scripts/reconcile-tatoeba-reviews.py --write`.
Verify: `python scripts/reconcile-tatoeba-reviews.py --check`.
"""
    outputs = {
        DIRECTORY / 'batch1-round3-review-check.md': round3_audit,
        DIRECTORY / 'batch1-review-report.tsv': stream.getvalue(),
        DIRECTORY / 'batch1-next-review.tsv': next_stream.getvalue(),
        DIRECTORY / 'batch1-review-chain.json': json.dumps(summary, ensure_ascii=False, indent=2) + '\n',
        DIRECTORY / 'batch1-review-report.md': markdown,
    }
    outputs.update(split_report(stream.getvalue()))
    return summary, outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true'); mode.add_argument('--check', action='store_true')
    args = parser.parse_args(); summary, outputs = build()
    for path, text in outputs.items():
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            if isinstance(text, bytes):
                path.write_bytes(text)
            else:
                path.write_text(text, encoding='utf-8', newline='\n')
        elif not path.exists() or (path.read_bytes() if isinstance(text, bytes) else path.read_text('utf-8')) != text:
            raise ValueError(f'Stale review report: {path.name}')
    # Only retire obsolete files in this generator's exact numbered TSV namespace.
    # No directory traversal, recursive deletion, source reports or custom files.
    for path in (DIRECTORY / 'batch1-review-report-parts').glob('batch1-review-report-part-[0-9][0-9].tsv'):
        if path not in outputs:
            if args.write:
                path.unlink()
            else:
                raise ValueError(f'Obsolete report part: {path.name}')
    print(json.dumps(summary['counts'], indent=2))


if __name__ == '__main__':
    main()
