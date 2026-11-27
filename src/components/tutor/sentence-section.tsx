import { useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { ArrowUpRight, Quote } from 'lucide-react';
import { externalExampleSources } from '@/lib/external-examples';
import { LessonHintsProvider, useLessonHints } from './lesson-hints';
import { useWorkspace } from './workspace';
import { ExampleSection, useExampleTab } from './example-tabs';
import { ExpandableCharacterGrid } from './expandable-character-grid';
import { exampleSearchText } from '@/lib/example-search';

/**
 * The shared "In a phrase" section of word and character detail cards.
 *
 * Inputs: `hanzi` — the exact written form searched; `children` — the
 * recorded examples, or nothing. With no recorded example the section still shows
 * (tab/label + absent note). The shared examples drawer owns the tab heading;
 * all recorded examples remain in the bounded Show all scroller. The external
 * search ("Search on the internet") sits in the card's action row (DetailRecordActions),
 * beside Trace/Recall/Bookmark, as a plain new-window link.
 */
/** Shared measured section layout for phrase and idiom examples; content changes re-arm it. */
export function useSentenceSectionLayout(recordKey: string, content: unknown) {
  const sectionRef = useRef<HTMLElement>(null);
  const activeTab = useExampleTab();
  // Judge the natural side layout first, then stack the whole section if any reading
  // falls below its hanzi, or an idiom translation exceeds two side-column lines.
  // Pinyin moves with the translation; the existing section-wide stack keeps siblings aligned.
  // Recheck newly revealed examples and settled web fonts;
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
        if (section.classList.contains('idiom-examples-section')) {
          const meaning = reading.querySelector('.sentence-meaning');
          if (meaning) {
            // Inline spans can produce several rectangles on one line (styled senses),
            // so count distinct line tops rather than rectangles or guessed font heights.
            const range = document.createRange();
            range.selectNodeContents(meaning);
            const tops: number[] = [];
            for (const rect of Array.from(range.getClientRects())) {
              if (rect.height > 0 && !tops.some(top => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
            }
            if (tops.length > 2) return true;
          }
        }
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
  }, [recordKey, content, activeTab]);
  return sectionRef;
}

export function SentenceSection({ hanzi, children }: { hanzi: string; children?: ReactNode }) {
  const sectionRef = useSentenceSectionLayout(hanzi, children);
  const hasExamples = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <ExampleSection id="phrase" label="In a phrase" icon={Quote} sectionRef={sectionRef} className="glyph-usage-section sentence-section">
    {hasExamples ? <SentenceHints backLabel={hanzi}>{children}</SentenceHints> : <p className="library-note">No recorded example phrase yet.</p>}
  </ExampleSection>;
}

/**
 * Header line inside one small example card: the record's own identity label, then its
 * recorded topic, joined by a middle dot.
 *
 * Inputs: `identity` — the already-rendered label for that record (the HSK level/ID pill for
 * a phrase, the frequency rank for an idiom); `topic` — the primary recorded subtopic label,
 * or null when the record has none; `link` — the card's shared top-right detail arrow
 * (`.detail-arrow-link`), rendered at the far right of the same row. With none of the three,
 * nothing renders, so a card never grows an empty header row, and the dot only appears
 * between two parts that both exist.
 */
export function ExampleCardMeta({ identity, topic, link }: { identity?: ReactNode; topic?: string | null; link?: ReactNode }) {
  if (!identity && !topic && !link) return null;
  return <div className="example-card-meta">
    {identity}
    {topic && <span className="example-card-topic">{identity ? <span aria-hidden="true">· </span> : null}{topic}</span>}
    {link}
  </div>;
}

/**
 * Source-ordered phrase examples, using the same expansion, border and bounded
 * scrollbar as character/word grids. A single column preserves sentence layout.
 */
export function MoreExamples({ examples, initialCount = 1 }: { examples: ReactNode[]; initialCount?: number }) {
  return <ExpandableCharacterGrid cards={examples} searchTexts={examples.map(exampleSearchText)} initialCount={initialCount} layout="list" label="All phrase examples"/>;
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
