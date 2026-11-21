import { Fragment, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { libraryDestination, libraryEntries } from '@/lib/character-library';
import { glyphCardInk, isRadicalGlyph } from '@/lib/card-ink';
import { howellInline, howellStructure, type HowellPart } from '@/lib/howell-structure';
import { lessonGlyphHint } from '@/lib/lesson-hints';
import { openDetailsHint } from '@/lib/tile-hints';
import { useWorkspace } from './workspace';
import { GlyphReadingSpeaker, MultiReadingSpeakers, isMultiReading } from './reading-speakers';

/**
 * Howell's interpretation inside the Etymology tab, laid out from the text's own notation
 * (lib/howell-structure.ts) instead of one plain paragraph:
 *   "Built from" — the parts joined by + (子# child + 女 woman), each a hanzi tile + its gloss,
 *                  # parts marked "sound + meaning" (Howell's phonosemantic element);
 *   meaning path — the → steps as a vertical list, *meanings* as soft chips, (← …) asides muted;
 *   notes        — later sentences as plain paragraphs; then a one-line key to the symbols.
 * Inputs: the exact source `text` and `selfGlyph` (the card's own glyph, drawn as a plain tile).
 * Every hanzi written in the text becomes a tile resolved by its exact written form only
 * (lessonGlyphHint: Characters, then Components, then a Radicals card of that same glyph — no
 * look-alike or canonical stand-in). A found record links to its own card and shows its
 * recorded pinyin + speaker in parentheses; anything else stays a plain tile. The text itself
 * is never altered, translated or spoken: speakers play the record's own reading.
 */
export function HowellEntry({ text, selfGlyph }: { text: string; selfGlyph: string }) {
  const structure = useMemo(() => howellStructure(text), [text]);
  const { formation, steps, notes } = structure;
  // A note without parts or a chain is one paragraph (still with tiles).
  const single = !formation && steps.length < 2;
  return <div className="howell">
    {formation && <div className="howell-formation">
      <span className="howell-label">Built from</span>
      <div className="howell-parts">{formation.map((part, i) => <Fragment key={i}>
        {i > 0 && <span className="howell-plus" aria-label="plus">+</span>}
        <FormationPart part={part} selfGlyph={selfGlyph}/>
      </Fragment>)}</div>
    </div>}
    {single
      ? <p className="howell-note howell-note-main"><HowellInline text={steps[0] ?? ''} selfGlyph={selfGlyph}/></p>
      : steps.length > 0 && <div className="howell-path-block">
          <span className="howell-label">Meaning path</span>
          <ol className="howell-path">{steps.map((step, i) => <li key={i} className="howell-step">
            <span className="howell-step-arrow" aria-hidden="true">{formation || i > 0 ? '→' : '•'}</span>
            <span className="howell-step-text"><HowellInline text={step} selfGlyph={selfGlyph}/></span>
          </li>)}</ol>
        </div>}
    {notes.map((note, i) => <p key={i} className="howell-note"><HowellInline text={note} selfGlyph={selfGlyph}/></p>)}
    <p className="howell-key">→ leads to · ← results from · # gives sound + meaning · highlighted: meanings in modern Japanese (Howell’s key)</p>
  </div>;
}

/** One "+" part: tile(s) + gloss when it is "hanzi[#] gloss", otherwise its text with inline tiles. */
function FormationPart({ part, selfGlyph }: { part: HowellPart; selfGlyph: string }) {
  if (part.kind === 'text') return <span className="howell-part is-text"><HowellInline text={part.text} selfGlyph={selfGlyph}/></span>;
  return <span className="howell-part">
    {part.lead && <span className="howell-part-lead">{part.lead}</span>}
    <span className="howell-part-glyphs">{part.glyphs.map((glyph, i) => <Fragment key={i}>
      {i > 0 && <span className="howell-slash">/</span>}
      <HowellGlyph glyph={glyph} self={glyph === selfGlyph}/>
    </Fragment>)}</span>
    {part.phonosemantic && <span className="howell-sound" title="Howell’s #: this part gives the sound as well as the meaning"># sound + meaning</span>}
    {part.gloss && <span className="howell-part-gloss"><HowellInline text={part.gloss} selfGlyph={selfGlyph}/></span>}
  </span>;
}

/** Recorded text with *meanings* as chips, hanzi as tiles and (← …) asides muted. */
function HowellInline({ text, selfGlyph }: { text: string; selfGlyph: string }) {
  const tokens = useMemo(() => howellInline(text), [text]);
  return <>{tokens.map((token, i) => {
    const reason = token.reason ? ' is-reason' : '';
    if (token.kind === 'meaning') return <em key={i} className={`howell-meaning${reason}`}>{token.text}</em>;
    if (token.kind === 'glyph') return <span key={i} className={`howell-inline-glyph${reason}`}><HowellGlyph glyph={token.glyph} self={token.glyph === selfGlyph}/>{token.phonosemantic && <span className="howell-hash" title="Howell’s #: gives the sound as well as the meaning">#</span>}</span>;
    return <span key={i} className={reason ? 'howell-reason' : undefined}>{token.text}</span>;
  })}</>;
}

/** One hanzi as a small bordered tile in its identity ink; links to the exact record's card
 *  (not for the card's own glyph) with "(pinyin 🔊)" beside it when a reading is recorded.
 *  The speaker sits outside the link so listening never navigates. */
function HowellGlyph({ glyph, self }: { glyph: string; self: boolean }) {
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
    ? <Link to="/characters" search={record.search} resetScroll={false} className={tileClass} title={label} aria-label={label} lang="zh-CN">{glyph}</Link>
    : <span className={tileClass} lang="zh-CN">{glyph}</span>;
  const pinyin = record?.hint.pinyin;
  return <span className="howell-glyph-wrap">
    {tile}
    {pinyin && <span className="howell-glyph-reading">(
      {isMultiReading(pinyin)
        ? <MultiReadingSpeakers spoken={record.hint.spoken} reading={pinyin} variant="example"/>
        : <><span className="pinyin">{pinyin}</span><GlyphReadingSpeaker spoken={record.hint.spoken} reading={pinyin} variant="example"/></>}
    )</span>}
  </span>;
}
