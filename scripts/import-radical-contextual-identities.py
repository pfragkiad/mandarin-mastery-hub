#!/usr/bin/env python3
"""Extract reviewed contextual identities for radical variant forms.

Input:  public/data/radical_variant_etymology_audit.json (the supplied audit; it stays
        lazily fetched for its etymology notes).
Output: src/data/radical-contextual-identities.json — only the variants that carry both
        `contextualIdentity` and `uiPresentationGuidance` (currently 96-1, the 王-shaped
        jade component), small enough to ship with the presentation adapter.

Why a separate file: the selected-variant heading, Practice and saved bookmarks need the
identity synchronously, while the 40 KB audit must stay out of page bundles. Nothing is
inferred — every field is copied verbatim and the record fails closed (is skipped with an
error) when its recorded glyph, family or guidance disagree with the audit row.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/data/radical_variant_etymology_audit.json'
TARGET = ROOT / 'src/data/radical-contextual-identities.json'


def main() -> int:
    audit = json.loads(SOURCE.read_text(encoding='utf-8'))
    identities = {}
    errors = []
    for row in audit['variants']:
        context = row.get('contextualIdentity')
        guidance = row.get('uiPresentationGuidance')
        if not context and not guidance:
            continue
        key = row['formKey']
        component = (context or {}).get('radicalComponent')
        if not component or not guidance:
            errors.append(f'{key}: contextualIdentity.radicalComponent and uiPresentationGuidance are both required')
            continue
        # The identity must describe exactly this audit row: same family, same recorded glyph.
        if component['familyRadicalId'] != row['radicalId'] or component['recordedFormGlyph'] != row['variant'] or component['parentRadical'] != row['radical']:
            errors.append(f'{key}: contextual identity does not match its audit row')
            continue
        # A variant pronunciation the guidance forbids must never be the presented reading.
        if guidance.get('doNotUseAsVariantPronunciation') == component['parentRadicalPinyin']:
            errors.append(f'{key}: parent reading is listed as a forbidden variant pronunciation')
            continue
        look = context.get('lookAlikeIndependentCharacter')
        identities[key] = {
            'familyId': row['radicalId'],
            'formKey': key,
            'recordedFormGlyph': component['recordedFormGlyph'],
            'displayGlyph': component['displayGlyph'],
            'aliases': row.get('aliases', []),
            'parentRadical': component['parentRadical'],
            'parentRadicalPinyin': component['parentRadicalPinyin'],
            'meaning': component['meaning'],
            'preferredLabel': component['preferredLabel'],
            # Learner-facing explanation shown on the card; readingNote stays in the (i) tooltip.
            'learnerNote': component.get('learnerNote'),
            'componentName': component.get('componentName'),
            'readingNote': component.get('readingNote'),
            'usageConstraint': component.get('usageConstraint'),
            'lookAlike': look,
            'guidance': guidance,
        }
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    out = {
        'source': {'file': 'public/data/radical_variant_etymology_audit.json', 'title': audit['title'], 'generatedOn': audit['generatedOn']},
        'identities': identities,
    }
    TARGET.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {len(identities)} contextual identities to {TARGET.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
