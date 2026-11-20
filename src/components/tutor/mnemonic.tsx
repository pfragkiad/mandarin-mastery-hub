import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { Image as ImageIcon, Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Mnemonic } from '@/lib/mnemonics';
import { RadicalForms } from './radical-forms';

/**
 * Memory-picture UI (src/lib/mnemonics.ts supplies the exact-glyph pictures).
 *
 * - MnemonicDialog: the enlarged picture in a modal window. Input: the picture and open state.
 *   Tricky bit: it renders inside a grid card's face button or the Glyphs DetailSheet (whose
 *   onKeyDown turns Left/Right into record navigation), and portal events still bubble through
 *   that React tree, so clicks and keys stop at its scope span; Esc closes only this window
 *   (Radix closes the top-most dialog).
 * - TileMnemonicButton: the picture icon beside a grid card's pinyin. The card face is a real
 *   <button>, so like TileSpeaker it is a role="button" span that swallows activation, so using
 *   it never selects the card.
 * - MnemonicPreview: the small thumbnail beside the hanzi in the detail card; click to enlarge.
 *   It shows only the picture's bottom half (its illustration), because the top half holds the
 *   character the card already prints large beside it.
 * - MnemonicPicture: the picture itself, plus the live character drawn in its top area. The
 *   owner's pictures either draw their own character there (covered by a paper-coloured band,
 *   mnemonic.band) or leave that area empty (band 0, draw true), and in both cases the glyph is
 *   re-drawn in the learner's current Character style font (var(--font-hanzi)) where the pictures
 *   place it. The overlay text is the picture's own exact glyph, never the selected form, and is
 *   aria-hidden because the popup title already names it. Sizes use container units so the
 *   thumbnail and the popup scale identically. A cropped picture (the preview) shows only the
 *   bottom half, so neither the cover nor the drawn glyph is rendered there — the popup keeps the
 *   full picture with the character in it. The paper colour comes from the record (mnemonic.paper)
 *   as an inline custom property, because the class default is only the fallback for a picture
 *   whose own background was never recorded.
 * - MnemonicFacts (optional on all three): the card's own pinyin, a listen callback and the
 *   translation, shown in the popup header (hanzi · pinyin · speaker) and under the picture. They
 *   are passed in by the card that opened the popup, never looked up here, so the popup repeats
 *   exactly what that card shows.
 * - MnemonicFamily (optional, radical cards only): the family's forms that own a picture, each with
 *   its own exact picture and facts, built by the opening card only when the popup opens. With two
 *   or more, the popup shows the detail card's form switch (RadicalForms layout="switch", limited
 *   to those forms, pick mode) and picking a tile swaps the picture and facts locally — no
 *   navigation, so the card behind it keeps its own selection. The tray is keyed by the picked
 *   form: FormSwitchThumb measures on mount and slides from the previous tile's note.
 */
const paperStyle = (mnemonic: Mnemonic) => (mnemonic.paper ? { '--mnemonic-paper': mnemonic.paper } as CSSProperties : undefined);

export type MnemonicFacts = { pinyin?: string | undefined; meaning?: ReactNode; onListen?: (() => void) | undefined; listenLabel?: string | undefined };
export function MnemonicPicture({ mnemonic, className, alt = '', lazy = false, crop = false, facts }: { mnemonic: Mnemonic; className?: string; alt?: string; lazy?: boolean; crop?: boolean; facts?: MnemonicFacts | undefined }) {
  return <span className={`mnemonic-picture${className ? ` ${className}` : ''}`} style={paperStyle(mnemonic)}>
    <img src={mnemonic.url} alt={alt} width={1024} height={1024} {...(lazy ? { loading: 'lazy' as const, decoding: 'async' as const } : {})}/>
    {!crop && mnemonic.band > 0 && <span className="mnemonic-picture-band" style={{ height: `${mnemonic.band * 100}%` }} aria-hidden="true"/>}
    {!crop && mnemonic.drawHanzi && <span className="mnemonic-picture-hanzi" lang="zh-CN" aria-hidden="true">{mnemonic.glyph}</span>}
    {/* The popup repeats the card's facts on the picture's empty top area, right of the drawn
        hanzi, so the artwork stays the focus; the cropped preview never shows them. */}
    {!crop && facts && <span className="mnemonic-picture-facts">
      {facts.pinyin && <span className="mnemonic-picture-pinyin pinyin">{facts.pinyin}{facts.onListen && <button type="button" className="mnemonic-picture-listen" aria-label={facts.listenLabel ?? `Listen to ${mnemonic.glyph}`} title="Listen" onClick={facts.onListen}><Volume2/></button>}</span>}
      {facts.meaning && <FittedMeaning meaning={facts.meaning}/>}
    </span>}
  </span>;
}

/** FittedMeaning: the popup translation on the picture. Input: the card's meaning. A plain-text
 *  meaning is split at its semicolons into alternative senses and whole senses are dropped from
 *  the end until the rest fits the 4-line box, so the picture never shows a sense cut off with an
 *  ellipsis (the first sense always stays). Other content renders as-is. */
function FittedMeaning({ meaning }: { meaning: ReactNode }) {
  const senses = typeof meaning === 'string' ? meaning.split(/\s*;\s*/).filter(Boolean) : null;
  const [shown, setShown] = useState(senses?.length ?? 0);
  const ref = useRef<HTMLSpanElement>(null);
  const key = typeof meaning === 'string' ? meaning : '';
  useLayoutEffect(() => { setShown(senses?.length ?? 0); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && senses && shown > 1 && el.scrollHeight > el.clientHeight + 1) setShown(shown - 1);
  });
  return <span ref={ref} className="mnemonic-picture-meaning">{senses ? senses.slice(0, shown).join('; ') : meaning}</span>;
}

export type MnemonicChoice = { formKey: string; mnemonic: Mnemonic; facts?: MnemonicFacts | undefined };
export type MnemonicFamily = { familyId: number; choices: () => MnemonicChoice[] };

export function MnemonicDialog({ mnemonic: opened, open, onOpenChange, facts: openedFacts, family }: { mnemonic: Mnemonic; open: boolean; onOpenChange: (open: boolean) => void; facts?: MnemonicFacts | undefined; family?: MnemonicFamily | undefined }) {
  // Built once per opening; the opened picture starts selected (its exact code point).
  const [choices] = useState(() => family ? family.choices() : []);
  const [pickedKey, setPickedKey] = useState(() => choices.find(choice => choice.mnemonic.codePoint === opened.codePoint)?.formKey);
  const picked = choices.length > 1 ? choices.find(choice => choice.formKey === pickedKey) : undefined;
  const mnemonic = picked?.mnemonic ?? opened;
  const facts = picked ? picked.facts : openedFacts;
  // React events from the portal still bubble through this component's ancestors (the grid card's
  // face button, the DetailSheet's arrow-key handler), so the scope span stops them here.
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return <span className="mnemonic-dialog-scope" onClick={stop} onDoubleClick={stop} onKeyDown={stop} onPointerDown={stop}><Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="mnemonic-dialog">
      {/* The title keeps only the glyph for context; the pinyin, speaker and translation are
          drawn on the picture itself, right of its hanzi (MnemonicPicture facts). */}
      <DialogTitle className="mnemonic-dialog-title"><strong lang="zh-CN">{mnemonic.glyph}</strong><span>Memory picture</span></DialogTitle>
      {family && picked && <div className="catalog-detail-forms mnemonic-dialog-forms"><RadicalForms key={picked.formKey} familyId={family.familyId} selectedKey={picked.formKey} hideLabel layout="switch" onlyKeys={new Set(choices.map(choice => choice.formKey))} onPick={form => setPickedKey(form.key)}/></div>}
      <MnemonicPicture mnemonic={mnemonic} className="mnemonic-dialog-image" alt={mnemonic.caption ?? `Memory picture for ${mnemonic.glyph}`} facts={facts}/>
      <DialogDescription className="mnemonic-dialog-note">Memory helper for <span lang="zh-CN">{mnemonic.glyph}</span> · not its etymology.</DialogDescription>
    </DialogContent>
  </Dialog></span>;
}

export function TileMnemonicButton({ mnemonic, facts, family }: { mnemonic: Mnemonic; facts?: MnemonicFacts; family?: MnemonicFamily | undefined }) {
  const [open, setOpen] = useState(false);
  const activate = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); setOpen(true); };
  return <>
    <span role="button" tabIndex={0} className="tile-mnemonic" aria-label={`Show the memory picture for ${mnemonic.glyph}`} title="Memory picture"
      onClick={activate} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}><ImageIcon/></span>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen} facts={facts} family={family}/>}
  </>;
}

/** `labelled`: the picture belongs to another form of the family (辶 shown on 辵), so a corner chip
 *  names that form and the picture is never read as the selected form's own. */
export function MnemonicPreview({ mnemonic, labelled = false, facts, family }: { mnemonic: Mnemonic; labelled?: boolean; facts?: MnemonicFacts; family?: MnemonicFamily | undefined }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="mnemonic-preview" aria-label={`Enlarge the memory picture for ${mnemonic.glyph}`} title={labelled ? `Memory picture for ${mnemonic.glyph} · click to enlarge` : 'Memory picture · click to enlarge'} onClick={() => setOpen(true)} style={paperStyle(mnemonic)}>
      <MnemonicPicture mnemonic={mnemonic} lazy crop/>
      {labelled && <span className="mnemonic-preview-form" lang="zh-CN" aria-hidden="true">{mnemonic.glyph}</span>}
    </button>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen} facts={facts} family={family}/>}
  </>;
}
