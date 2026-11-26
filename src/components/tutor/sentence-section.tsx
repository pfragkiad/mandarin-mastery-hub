import { useId, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Quote } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { externalExampleSources } from '@/lib/external-examples';
import { LessonHintsProvider, useLessonHints } from './lesson-hints';
import { useWorkspace } from './workspace';

/**
 * The shared "In a phrase" section of word and character detail cards.
 *
 * Inputs: `hanzi` — the exact written form searched; `children` — the
 * recorded examples, or nothing. With no recorded example the section still shows
 * (label + absent note) so the search links are always reachable.
 *
 * The head carries the internal "Search in phrases" link, the same shape as the idiom
 * section's "Search in idioms": a router Link into the Vocabulary Phrases tab filtered
 * by this exact written form, so the results are the app's own records. The external
 * search ("Search on the internet") sits in the card's action row (DetailRecordActions),
 * beside Trace/Recall/Bookmark, as a plain new-window link.
 */
export function SentenceSection({ hanzi, children }: { hanzi: string; children?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  // Judge the natural side layout first, then stack the whole section if any reading
  // falls below its hanzi. Recheck newly revealed examples and settled web fonts;
  // height-only observer notifications must not cause reset/stack feedback loops.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !section.closest('.detail-sheet')) return;
    let alive = true;
    let width = section.getBoundingClientRect().width;
    const measure = () => {
      if (!alive) return;
      delete section.dataset['sentencesStacked'];
      const stacked = Array.from(section.querySelectorAll<HTMLElement>('.glyph-usage-example > .sentence')).some(sentence => {
        const hanziRow = sentence.querySelector<HTMLElement>('.sentence-hanzi-row');
        const reading = sentence.querySelector<HTMLElement>('.sentence-reading');
        if (!hanziRow || !reading || !reading.textContent?.trim()) return false;
        const hanziBox = hanziRow.getBoundingClientRect();
        const readingBox = reading.getBoundingClientRect();
        return hanziBox.height > 0 && readingBox.top >= hanziBox.bottom - 1;
      });
      if (stacked) section.dataset['sentencesStacked'] = '';
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const nextWidth = section.getBoundingClientRect().width;
      if (nextWidth === width) return;
      width = nextWidth;
      measure();
    });
    resize?.observe(section);
    const mutations = new MutationObserver(measure);
    mutations.observe(section, { childList: true, subtree: true, characterData: true });
    // Display size and character style change without necessarily resizing the section.
    const preferences = new MutationObserver(measure);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-display-size', 'data-character-style'] });
    void document.fonts?.ready.then(measure);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      alive = false;
      resize?.disconnect();
      mutations.disconnect();
      preferences.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [hanzi, children]);
  const hasExamples = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section ref={sectionRef} className="glyph-usage-section sentence-section" aria-label="In a phrase">
    <div className="sentence-section-head">
      <h3 className="eyebrow"><Quote size={13} aria-hidden="true"/>IN A PHRASE</h3>
      <Link className="find-examples-link internal-examples-link" to="/vocabulary" search={{ tab: 'phrase', q: hanzi }} title={`Search phrases containing ${hanzi}`}>
        Search in phrases<ArrowRight className="find-examples-icon" aria-hidden="true"/>
      </Link>
    </div>
    {hasExamples ? <SentenceHints backLabel={hanzi}>{children}</SentenceHints> : <div className="record-gap"><p>No recorded example phrase yet.</p></div>}
  </section>;
}

/**
 * Header line inside one small example card: the record's own identity label, then its
 * recorded topic, joined by a middle dot.
 *
 * Inputs: `identity` — the already-rendered label for that record (the HSK level/ID pill for
 * a phrase, the frequency rank for an idiom); `topic` — the primary recorded subtopic label,
 * or null when the record has none. With neither, nothing renders, so a card never grows an
 * empty header row, and the dot only appears between two parts that both exist.
 */
export function ExampleCardMeta({ identity, topic }: { identity?: ReactNode; topic?: string | null }) {
  if (!identity && !topic) return null;
  return <div className="example-card-meta">
    {identity}
    {topic && <span className="example-card-topic">{identity ? <span aria-hidden="true">· </span> : null}{topic}</span>}
  </div>;
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
export function MoreExamples({ examples, initialCount = 1 }: { examples: ReactNode[]; initialCount?: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const visible = examples.slice(0, initialCount);
  const rest = examples.slice(initialCount);
  if (!rest.length) return <>{visible}</>;
  const label = open ? `Show fewer examples` : `Show ${rest.length} more example${rest.length === 1 ? '' : 's'}`;
  return <>
    {visible}
    {open && <div id={panelId} className="more-examples-panel">{rest}</div>}
    <button type="button" className={`more-examples-toggle${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen(value => !value)}>
      <ChevronDown className="more-examples-icon" aria-hidden="true"/>{label}
    </button>
  </>;
}

/** External-search icon shared by the cards' "Examples" button and the detail action row's
 *  "Search on the internet" link: the familiar up-right arrow that says "opens outside the app". */
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
 * LessonHintsProvider, same remembered "Glyph quick cards" switch, absent = on), so tapping
 * a character in "In a phrase" opens its mini card with the containing word. Inside a
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
