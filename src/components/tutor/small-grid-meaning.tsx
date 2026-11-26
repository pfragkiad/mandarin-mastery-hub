import { useRef } from 'react';
import { MeaningText } from './meaning-text';
import { useSenseTrim } from './use-sense-trim';

/** Small detail-grid translation. Uses the library's measured whole-sense trim:
 * drop trailing translations beyond three lines, but keep a sole sense intact.
 * The full recorded text remains available in the title and underlying data. */
export function SmallGridMeaning({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useSenseTrim(ref, text, 3);
  return <span ref={ref} className="glyph-usage-meaning" title={text}><MeaningText text={shown}/></span>;
}