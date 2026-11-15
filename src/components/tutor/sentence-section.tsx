import type { ReactNode } from 'react';
import { MessageSquareText } from 'lucide-react';
import { externalExampleSources } from '@/lib/external-examples';

/**
 * The shared "In a sentence" section of word and character detail cards.
 *
 * Inputs: `hanzi` — the exact written form searched externally; `children` — the
 * recorded examples, or nothing. With no recorded example the section still shows
 * (label + absent note) so "Find more examples" is always reachable.
 *
 * "Find more examples" is a plain link opening the external search in a new
 * window/tab (target=_blank, noopener) so the current page stays open; nothing from
 * the external site is imported into the catalogue.
 */
export function SentenceSection({ hanzi, children }: { hanzi: string; children?: ReactNode }) {
  const source = externalExampleSources(hanzi)[0];
  const hasExamples = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="glyph-usage-section sentence-section" aria-label="In a sentence">
    <div className="sentence-section-head">
      <h3 className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>IN A SENTENCE</h3>
      {source && <a className="find-examples-link" href={source.url} target="_blank" rel="noopener noreferrer" title={`Search ${source.name} for example sentences with ${hanzi} (opens in a new window)`}>
        <SearchExternalIcon/>Find more examples
      </a>}
    </div>
    {hasExamples ? children : <div className="record-gap"><p>No recorded example sentence yet.</p></div>}
  </section>;
}

/** Magnifier with an up-right arrow: "search, and leave the app" (designer option C). */
function SearchExternalIcon() {
  return <svg className="find-examples-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="10" cy="14" r="6"/><path d="M14.4 18.4 19 23"/><path d="M15 9l6-6"/><path d="M16 3h5v5"/>
  </svg>;
}
