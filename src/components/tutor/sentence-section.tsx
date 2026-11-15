import type { ReactNode } from 'react';
import { ArrowUpRight, MessageSquareText } from 'lucide-react';
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
        Find more examples<ExternalExamplesIcon/>
      </a>}
    </div>
    {hasExamples ? children : <div className="record-gap"><p>No recorded example sentence yet.</p></div>}
  </section>;
}

/** External-search icon shared by "Find more examples" and the cards' "Examples" button:
 *  the familiar up-right arrow that says "opens outside the app". */
export function ExternalExamplesIcon() {
  return <ArrowUpRight className="find-examples-icon" aria-hidden="true"/>;
}
