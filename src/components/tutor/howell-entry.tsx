import { Fragment, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HintBody } from './source-info';
import { libraryDestination, libraryEntries } from '@/lib/character-library';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { howellInline, howellPresentation, type HowellToken } from '@/lib/howell-structure';
import { lessonGlyphHint } from '@/lib/lesson-hints';
import { openDetailsHint } from '@/lib/tile-hints';
import { useWorkspace } from './workspace';
import { requestDetailTab } from '@/lib/detail-tab-memory';
import { GlyphReadingSpeaker, MultiReadingSpeakers, isMultiReading } from './reading-speakers';

/**
 * Howell's interpretation inside the Etymology tab, laid out by the visual roles of
 * public/data/etymology/HOWELL_PRESENTATION.md from lib/howell-structure.ts blocks, in the
 * note's own order and without changing a word:
 *   context     — a preface/origin account (historical-form wording kept verbatim);
 *   composition — "Elements in Howell's account": each element a bordered card (hanzi tile +
 *                 gloss, or a described element), "+" bound to the element after it so no
 *                 orphan plus ends a line; # marks stay on what they were written after;
 *   progression — "Meaning path": arrowed steps, (← …) reasons indented under their step;
 *   prose       — every other sentence at normal reading contrast (uncertainty kept visible);
 * with no "Original text" disclosure (owner's choice: the structured layout is the only view;
 * tests still prove it rebuilds the source exactly). The symbol key lives in
 * HowellKeyInfo, an (i) popover beside the "author interpretation" label in the source header
 * (etymology-section.tsx), so the note itself stays free of footnotes.
 * Inputs: the exact source `text` and `selfGlyph` (the card's own glyph, a plain dashed tile).
 * Every hanzi written in the text becomes a tile resolved by its exact written form only
 * (lessonGlyphHint: Characters, then Components, then a Radicals card of that same glyph — no
 * look-alike or canonical stand-in). A found record links to its own card and shows its
 * recorded pinyin + speaker in parentheses; anything else stays a plain tile. The text itself
 * is never altered, translated or spoken: speakers play the record's own reading.
 */
export function HowellEntry({ text, selfGlyph }: { text: string; selfGlyph: string }) {
  const { blocks } = useMemo(() => howellPresentation(text), [text]);
  return <div className="howell">
    {blocks.map((block, i) => {
      if (block.kind === 'gap') return null;
      if (block.kind === 'context') return <p key={i} className="howell-context"><HowellInline text={block.text} selfGlyph={selfGlyph}/></p>;
      if (block.kind === 'prose') return <p key={i} className={block.later ? 'howell-prose is-later' : 'howell-prose'}><HowellInline text={block.text} selfGlyph={selfGlyph}/></p>;
      if (block.kind === 'composition') return <div key={i} className="howell-formation">
        <span className="howell-label">Elements in Howell’s account</span>
        <div className="howell-parts">{block.parts.map((part, j) => <span key={j} className="howell-unit">
          {j > 0 && <span className="howell-plus" aria-label="plus">+</span>}
          <span className="howell-part"><HowellInline text={part.text} selfGlyph={selfGlyph}/></span>
        </span>)}</div>
      </div>;
      return <div key={i} className="howell-path-block">
        <span className="howell-label">Meaning path</span>
        <ol className="howell-path">{block.steps.map((step, j) => <li key={j} className="howell-step">
          <span className="howell-step-arrow" aria-hidden="true">→</span>
          <span className="howell-step-text"><HowellInline text={step.text} selfGlyph={selfGlyph}/></span>
        </li>)}</ol>
      </div>;
    })}
  </div>;
}

/** The symbol key as an (i) popover, placed beside the "author interpretation" label in the
 *  Howell source header (etymology-section.tsx). One row per symbol, same shared hint card
 *  as every other (i) in the app. */
export function HowellKeyInfo() {
  return <Popover>
    <PopoverTrigger className="source-info-trigger" aria-label="Howell’s symbol key"><Info aria-hidden="true"/></PopoverTrigger>
    <PopoverContent className="source-info-popover howell-key" align="start" collisionPadding={12}>
      <HintBody>
        <span><span className="howell-arrow">→</span> leads to</span><br/>
        <span><span className="howell-arrow">←</span> results from</span><br/>
        <span><HashMark/> gives sound as well as meaning</span><br/>
        <span><em className="howell-meaning">highlighted</em> — Howell’s marked modern Japanese meanings</span>
      </HintBody>
    </PopoverContent>
  </Popover>;
}

/** Howell's # mark, focusable so its help reaches keyboard and touch users too. */
function HashMark() {
  const help = 'Howell’s #: the element written before it gives the sound as well as the meaning (his interpretation; not a modern Mandarin sound match)';
  return <abbr className="howell-hash" title={help} aria-label={help} tabIndex={0}>#</abbr>;
}

/** Recorded text with *meanings* as chips, hanzi as tiles, # marks, coloured arrows and
 *  (← …) reasons grouped into one indented aside attached to the piece they qualify. */
function HowellInline({ text, selfGlyph }: { text: string; selfGlyph: string }) {
  const tokens = useMemo(() => howellInline(text), [text]);
  // Consecutive reason tokens form one aside, so a local "(← a ← b)" chain stays together.
  const groups: { reason: boolean; tokens: HowellToken[] }[] = [];
  for (const token of tokens) {
    const last = groups.at(-1);
    if (last && last.reason === token.reason) last.tokens.push(token);
    // Closing punctuation right after an aside (".", ").") joins it, never a lone line.
    else if (last?.reason && token.kind === 'text' && /^[\s.,;:)]+$/.test(token.text)) last.tokens.push(token);
    else groups.push({ reason: token.reason, tokens: [token] });
  }
  const render = (token: HowellToken, i: number) => {
    if (token.kind === 'meaning') return <em key={i} className="howell-meaning">{token.text}</em>;
    if (token.kind === 'glyph') return <span key={i} className="howell-inline-glyph"><HowellGlyph glyph={token.glyph} self={token.glyph === selfGlyph} marked={token.phonosemantic}/></span>;
    if (token.kind === 'marker') return <HashMark key={i}/>;
    if (token.kind === 'arrow') return <span key={i} className="howell-arrow">{token.text}</span>;
    return <Fragment key={i}>{token.text}</Fragment>;
  };
  return <>{groups.map((group, g) => group.reason
    ? <span key={g} className="howell-reason">{group.tokens.map(render)}</span>
    : <Fragment key={g}>{group.tokens.map(render)}</Fragment>)}</>;
}

/** One hanzi as a small bordered tile in its identity ink; links to the exact record's card
 *  (not for the card's own glyph) with "(pinyin 🔊)" beside it when a reading is recorded.
 *  Following the link opens that card on its Etymology tab (requestDetailTab), so reading
 *  continues there and Back returns here. The speaker sits outside the link so listening never navigates; `marked` puts Howell's #
 *  right after the tile it was written after. */
function HowellGlyph({ glyph, self, marked }: { glyph: string; self: boolean; marked: boolean }) {
  const { preferences, catalogVersion } = useWorkspace();
  const record = useMemo(() => {
    const hint = lessonGlyphHint(glyph, preferences.includeTraditional);
    if (!hint) return null;
    const entry = libraryEntries(hint.kind).find(item => item.id === hint.id);
    const ink = entry ? glyphCardInk(hint.kind, entry.script, isRadicalGlyph(entry, hint.kind)) : '';
    // The recorded ID wins; the glyph index only supplies its page.
    const destination = libraryDestination(glyph, preferences.includeTraditional);
    return { hint, ink, search: destination && destination.id === hint.id ? destination : hint.search };
    // catalogVersion: the catalogue loads lazily; recompute once it arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph, preferences.includeTraditional, catalogVersion]);
  const tileClass = `howell-glyph ${record?.ink ?? ''}${self ? ' is-self' : ''}`;
  const label = record ? openDetailsHint(glyph, record.hint.kind) : glyph;
  const tile = record && !self
    ? <Link to="/characters" search={record.search} resetScroll={false} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) requestDetailTab('etymology'); }} className={tileClass} title={label} aria-label={label} lang="zh-CN">{glyph}</Link>
    : <span className={tileClass} lang="zh-CN">{glyph}</span>;
  const pinyin = record?.hint.pinyin;
  return <span className="howell-glyph-wrap">
    {tile}{marked && <HashMark/>}
    {pinyin && <span className="howell-glyph-reading">(
      {isMultiReading(pinyin)
        ? <MultiReadingSpeakers spoken={record.hint.spoken} reading={pinyin} variant="example"/>
        : <><span className="pinyin">{pinyin}</span><GlyphReadingSpeaker spoken={record.hint.spoken} reading={pinyin} variant="example"/></>}
    )</span>}
  </span>;
}
