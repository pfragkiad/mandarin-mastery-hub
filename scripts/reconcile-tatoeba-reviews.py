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

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'importer/data/tatoeba/reports'
REVIEW_FILES = ['tatoeba-quality-report.-batch1.tsv', 'tatoeba-quality-report-reviewer2-batch1.tsv']
FIELDS = ['id', 'character', 'sentence', 'translation']
REVIEW_FIELDS = ['zh_script', 'zh_quality_score', 'zh_quality_rating', 'zh_issues',
                 'en_quality_score', 'en_quality_rating', 'en_issues', 'overall_status', 'review_notes']


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
    markdown = f"""# Batch 1 — consolidated report and proposed corrections

**Status: pending another review round. No final content has been chosen.**

This report covers the **{len(rows)} exact-OK first candidates** (220 source
sentence pairs), the owner's “super OK” batch. The input file called
`tatoeba-quality-report.-batch1.tsv` actually reviews all {len(first):,} original
candidates; Reviewer 2 returns {len(second)} rows across that larger set. Only
the 375-row OK subset is included in the output here.

| Effective supplied decision | Rows |
| --- | ---: |
| Pass | {counts.get('Pass', 0)} |
| Minor Review | {counts.get('Minor_Review', 0)} |
| Needs Fix | {counts.get('Needs_Fix', 0)} |

Reviewer 2 overrides the {summary['counts']['reviewer2ReturnedInThisBatch']} returned rows in this subset.
The other {summary['counts']['acceptedReviewer1InThisBatch']} rows accept Reviewer 1's exact findings under
the owner's instruction, including unresolved flags. These are not independent
double-pass claims. Original scores, issue labels and notes remain preserved.

## Files for the next reviewer

- [Full report with originals, decisions and proposed corrections](batch1-final-report.tsv):
  all 375 rows, both review histories and separate suggested Chinese/English.
- [Minimal proposed-content TSV](batch1-next-review.tsv): exactly `id`, `character`,
  `sentence`, `translation`, using the proposed wording for the next round.
- [Structured review-chain metadata](batch1-review-chain.json): exact original
  and proposed text hashes, provenance, scoped findings and source/warning markers.
- [Editable draft proposals](batch1-suggested-corrections.json): {len(proposals)}
  distinct flagged sentence pairs covering 67 rows. Proposals are assistant-authored
  drafts. No reviewer has approved these proposed edits yet.

The 308 Pass rows carry their source wording forward. Proposed Chinese edits
affect {summary['counts']['proposedChineseEdits']} rows and proposed English edits affect
{summary['counts']['proposedEnglishEdits']} rows; these counts overlap.
Every proposed sentence retains its exact target character. Original Tatoeba
Chinese/English and both supplied report files are unchanged.

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
    return summary, {
        DIRECTORY / 'batch1-final-report.tsv': stream.getvalue(),
        DIRECTORY / 'batch1-next-review.tsv': next_stream.getvalue(),
        DIRECTORY / 'batch1-review-chain.json': json.dumps(summary, ensure_ascii=False, indent=2) + '\n',
        DIRECTORY / 'batch1-final-report.md': markdown,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true'); mode.add_argument('--check', action='store_true')
    args = parser.parse_args(); summary, outputs = build()
    for path, text in outputs.items():
        if args.write:
            path.write_text(text, encoding='utf-8', newline='\n')
        elif not path.exists() or path.read_text('utf-8') != text:
            raise ValueError(f'Stale final report: {path.name}')
    print(json.dumps(summary['counts'], indent=2))


if __name__ == '__main__':
    main()
