// ============= Full file contents =============

/** Split points: form descriptions and parenthesised spans are not lexical translations. */
const SPLIT = /(component form of[^;·\n]*|[（(][^（）()·\n]*[）)])/gi;

/** Pure splitter so the italic rule is testable without rendering. */
export function meaningParts(text: string): string[] {
  return text.split(SPLIT);
}

/** Form descriptions and parenthesised spans render italic; surrounding meanings stay upright. */
export function MeaningText({ text }: { text: string }) {
  return <>{meaningParts(text).map((part, index) => /^component form of/i.test(part) || /^[（(]/.test(part)
    ? <em key={index} className="italic">{part}</em>
    : part)}</>;
}
