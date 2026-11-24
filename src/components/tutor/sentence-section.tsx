import { useId, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ArrowUpRight, ChevronDown, Quote } from 'lucide-react';
import { externalExampleSources } from '@/lib/external-examples';
import { LessonHintsProvider, useLessonHints } from './lesson-hints';
import { useWorkspace } from './workspace';

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
      <h3 className="eyebrow"><Quote size={13} aria-hidden="true"/>IN A SENTENCE</h3>
      {source && <a className="find-examples-link" href={source.url} target="_blank" rel="noopener noreferrer" title={`Search ${source.name} for example sentences with ${hanzi} (opens in a new window)`}>
        Find more examples<ExternalExamplesIcon/>
      </a>}
    </div>
    {hasExamples ? <SentenceHints backLabel={hanzi}>{children}</SentenceHints> : <div className="record-gap"><p>No recorded example sentence yet.</p></div>}
  </section>;
}

/**
 * Show-more drawer for a card's recorded example sentences.
 *
 * Inputs: `examples` — the rendered examples in source order. The first stays visible;
 * the rest sit behind one arrow toggle ("Show 1 more example" / "Show fewer examples").
 * State: `open`, local and starting closed, so every detail card opens compact. Callers
 * key this by the record so moving to another card starts closed again. Collapsed
 * examples are not rendered at all, so their links and speakers cannot take focus.
 */
export function MoreExamples({ examples }: { examples: ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const [first, ...rest] = examples;
  if (!rest.length) return <>{first}</>;
  const label = open ? `Show fewer examples` : `Show ${rest.length} more example${rest.length === 1 ? '' : 's'}`;
  return <>
    {first}
    {open && <div id={panelId} className="more-examples-panel">{rest}</div>}
    <button type="button" className={`more-examples-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen(value => !value)}>
      <ChevronDown className="more-examples-icon" aria-hidden="true"/>{label}
    </button>
  </>;
}

/** External-search icon shared by "Find more examples" and the cards' "Examples" button:
 *  the familiar up-right arrow that says "opens outside the app". */
export function ExternalExamplesIcon() {
  return <ArrowUpRight className="find-examples-icon" aria-hidden="true"/>;
}

/**
 * Card-face "examples" icon beside the pinyin speaker (Characters and Words cards only).
 * The card face is itself a <button>, so a real <a> would be invalid markup: like the
 * tile speaker and Sound chart link, this is a role="link" span that swallows activation
 * (the card neither opens nor reveals) and opens the external search in a new window.
 * Input: the exact hanzi searched.
 */
export function TileExamplesLink({ hanzi }: { hanzi: string }) {
  const source = externalExampleSources(hanzi)[0];
  if (!source) return null;
  const label = `Find example sentences for ${hanzi} on ${source.name} (opens in a new window)`;
  const open = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); window.open(source.url, '_blank', 'noopener,noreferrer'); };
  return <span role="link" tabIndex={0} className="examples-link is-tile" aria-label={label} title={label}
    onClick={open} onKeyDown={event => { if (event.key === 'Enter') open(event); }}><ExternalExamplesIcon/></span>;
}

/**
 * Detail-card sentences get the same quick-card popups as lessons (one shared
 * LessonHintsProvider, same remembered "Character hints" switch, absent = on), so tapping
 * a character in "In a sentence" opens its mini card with the containing word. Inside a
 * lesson (a provider already above) nothing is added, so there is never a second popup.
 * Word/phrase detail cards wrap their whole content in it (word-card.tsx) so the heading's
 * characters and the sentences share that one popup.
 */
export function SentenceHints({ backLabel, children }: { backLabel: string; children: ReactNode }) {
  const parent = useLessonHints();
  const { preferences } = useWorkspace();
  if (parent) return <>{children}</>;
  return <LessonHintsProvider enabled={preferences.lessonHints !== false} backLabel={backLabel}>{children}</LessonHintsProvider>;
}
