import { isValidElement, type ReactNode } from 'react';

/** Match recorded Hanzi, pinyin or English without changing record order/identity. */
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function exampleSearchMatches(text: string, query: string) {
  const normalizedQuery = normalize(query);
  // Count Unicode characters after trimming/normalizing, so a tone mark is not
  // a second character and supplementary Hanzi are not counted twice.
  const ready = Array.from(normalizedQuery).length >= 2 || /\p{Script=Han}/u.test(normalizedQuery);
  return !ready || normalize(text).includes(normalizedQuery);
}

/** Read only SentenceExample's recorded fields in the existing rendered handoff;
 * never index header ranks, hints, source notes or audio/navigation controls. */
export function exampleSearchText(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(exampleSearchText).join(' ');
  if (!isValidElement<{ sentence?: string; pinyin?: string; translation?: string; children?: ReactNode }>(node)) return '';
  const { sentence, pinyin, translation, children } = node.props;
  return [sentence, pinyin, translation, exampleSearchText(children)].filter(Boolean).join(' ');
}