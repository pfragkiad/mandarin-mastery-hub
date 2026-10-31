/** Form descriptions are not lexical translations; preserve surrounding meanings. */
export function MeaningText({ text }: { text: string }) {
  return <>{text.split(/(component form of[^;·\n]*)/gi).map((part, index) => /^component form of/i.test(part)
    ? <em key={index} className="italic">{part}</em>
    : part)}</>;
}