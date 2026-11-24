# Frontend migration report · Mandarin Core v3.6.0

## What changes

HSK topic lessons, Conversational Mandarin, and independent character lessons now share a pattern display. Render **Hanzi**, **pinyin**, and **pseudo-translation**, in that order. The third line uses English placeholders in angle brackets and bold fixed Mandarin. Keep the existing explanations, worked examples, and completion controls below the pattern.

The release contains 92 HSK patterns, 43 conversational patterns, and 11 independent character constructions. This report describes the packaged JSON and the React integration. The packaged HTML and Markdown already display the third line.

## JSON contract

| Lesson family | Source of pattern rows | Format in this release | Third-line contract |
|---|---|---|---|
| HSK Levels 1 and 2 | `sections.teaching_plan.patterns[]` | `mandarin-topic-lesson/3.4.0` | All three fields are required. The new format rejects `formula_en`. |
| Conversational Mandarin | `sections.blocks[]` where `kind === "grammar_pattern"` | `mandarin-general-lesson/3.4.0` | Hanzi and pinyin are required. The pseudo-translation is optional in the schema and populated in all 43 released patterns. |
| Independent character lessons | `sections.constructions.items[]`, respecting `sections.constructions.enabled` | `mandarin-character-lesson/3.2.0` | The schema accepts an optional pseudo-translation. Both released lessons populate it on every construction. The version string stays at 3.2.0, so the validator itself must be refreshed. |

All three families use `pattern_hanzi`, `pattern_pinyin`, and `pattern_pseudo_translation`. Keep mapping the rest of each card from its own record.

| Lesson family | Explanation | Worked examples |
|---|---|---|
| HSK topic | `explanation_en` | `examples[]` with `hanzi`, `pinyin`, and `english` |
| Conversational | `function_en` | `example` with `hanzi`, `pinyin`, `english`, and `teaching_note` |
| Character | `function_en`, `register`, and `usage_note` | `example` with `hanzi`, `pinyin`, and `meaning_en` in the released lessons |

HSK also has a separate `sections.grammar_points[]` collection. Keep its existing behavior. The migrated cards come from `sections.teaching_plan.patterns[]`.

## Rendering

A representative HSK record contains these fields:

```json
{
  "pattern_hanzi": "主语 + 会/能 + 动词",
  "pattern_pinyin": "zhǔyǔ + huì/néng + dòngcí",
  "pattern_pseudo_translation": "<subject> + 会/能 + <verb>"
}
```

The rendered pattern should look like this:

主语 + 会/能 + 动词  
*zhǔyǔ + huì/néng + dòngcí*  
&lt;subject&gt; + **会/能** + &lt;verb&gt;

- Use the existing Kai-style font stack for Hanzi and mark Mandarin text with `lang="zh-CN"`. Allow wrapping on narrow screens.
- Render the pseudo-translation from plain text. Keep angle brackets visible and preserve punctuation, alternatives, parentheses, and spacing. A fixed phrase with no slots still gets its third line when the field is present.
- Use React text nodes. Treat the angle-bracket syntax as display markers and avoid `dangerouslySetInnerHTML`.
- Keep pattern formulas out of text-to-speech. Continue using the worked example's Hanzi through the existing audio path.
- Keep stable card and checkpoint identifiers. Scope card IDs by lesson where needed because IDs such as `pattern-1` recur across lessons.

## React integration

Normalize only the pattern heading before passing it to a shared component. The examples and progress UI can stay in the existing lesson renderers.

```ts
type PatternSource = {
  pattern_hanzi?: string;
  pattern_pinyin?: string;
  pattern_pseudo_translation?: string;
  formula_en?: string;
};

function toPatternHeading(card: PatternSource) {
  return {
    hanzi: card.pattern_hanzi,
    pinyin: card.pattern_pinyin,
    pseudoTranslation: card.pattern_pseudo_translation,
    legacyFormula: card.formula_en,
  };
}
```

For a validated modern card, render the Hanzi and pinyin and show the third line when present. If the heading contains only a legacy HSK `formula_en`, render it using the existing one-line presentation. For legacy conversational or character cards without the third field, show their Hanzi and pinyin. Read the character field by presence, since both old and updated character records can declare 3.2.0.

The following example preserves each whitespace and separator character and keeps English placeholders distinct from fixed Mandarin:

```tsx
function PseudoTranslation({ value }: { value: string }) {
  return (
    <div className="pattern-pseudo-translation">
      {value
        .split(/(<[^<>]+>|\p{Script=Han}+(?:\/\p{Script=Han}+)*[！？。]?)/u)
        .map((part, index) => {
          if (/^<[^<>]+>$/.test(part)) {
            return <span key={index} className="pattern-slot">{part}</span>;
          }
          if (/^\p{Script=Han}/u.test(part)) {
            return <strong key={index} lang="zh-CN">{part}</strong>;
          }
          return part;
        })}
    </div>
  );
}
```

If the app caches decoded lessons or compiled validators, bump the relevant cache revision. Character lessons in particular cannot rely on a changed payload version string for cache invalidation.

## Rollout and acceptance

1. Replace the bundled topic, general, and character schema definitions with the Core v3.6.0 copies. Update version allowlists, importers, and TypeScript types if they maintain independent copies of the schema contract.
2. Deploy the shared heading renderer with both legacy fallbacks. Switch the lesson manifests to the v3.6.0 packages after the updated frontend can import them.
3. Run these checks against the app and its import flow before enabling the new packages.

| Check | Expected result |
|---|---|
| New HSK Level 1 and Level 2 import | All 46 lessons load. Each of the 92 teaching patterns shows exactly three lines. |
| New HSK validation | An omitted pattern field or a reintroduced `formula_en` is rejected by the topic v3.4.0 schema. |
| Legacy HSK import | Topic v3.3.0 formula cards still render with `formula_en`. |
| Conversational and character imports | All 43 conversational patterns and 11 character constructions show the third line. Legacy cards with no third line still render. |
| Placeholder and fixed text | The angle brackets in `<subject>` remain visible and Mandarin stays bold. Verify alternatives, multiple slots, and a fixed phrase with no slots. |
| Audio and progress | Worked example audio still plays and completed checkpoints remain completed across the package swap. |
| Narrow viewport | The three lines wrap within the card while retaining the correct reading order. |

These checks are for the React integration. No app code or deployed browser behavior was verified for this report.
