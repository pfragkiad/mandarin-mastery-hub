import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { Image as ImageIcon, Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Mnemonic } from '@/lib/mnemonics';

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
 * - MnemonicFacts (optional on all three): the card's own pinyin, a listen callback and the
 *   translation, shown in the popup header (hanzi · pinyin · speaker) and under the picture. They
 *   are passed in by the card that opened the popup, never looked up here, so the popup repeats
 *   exactly what that card shows.
 */
export type MnemonicFacts = { pinyin?: string | undefined; meaning?: ReactNode; onListen?: (() => void) | undefined; listenLabel?: string | undefined };
export function MnemonicDialog({ mnemonic, open, onOpenChange, facts }: { mnemonic: Mnemonic; open: boolean; onOpenChange: (open: boolean) => void; facts?: MnemonicFacts | undefined }) {
  // React events from the portal still bubble through this component's ancestors (the grid card's
  // face button, the DetailSheet's arrow-key handler), so the scope span stops them here.
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return <span className="mnemonic-dialog-scope" onClick={stop} onDoubleClick={stop} onKeyDown={stop} onPointerDown={stop}><Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="mnemonic-dialog">
      <DialogTitle className="mnemonic-dialog-title"><strong lang="zh-CN">{mnemonic.glyph}</strong>{facts?.pinyin ? <span className="mnemonic-dialog-pinyin pinyin">{facts.pinyin}</span> : <span>Memory picture</span>}{facts?.onListen && <button type="button" className="mnemonic-dialog-listen" aria-label={facts.listenLabel ?? `Listen to ${mnemonic.glyph}`} title="Listen" onClick={facts.onListen}><Volume2/></button>}</DialogTitle>
      <img className="mnemonic-dialog-image" src={mnemonic.url} alt={mnemonic.caption ?? `Memory picture for ${mnemonic.glyph}`} width={1024} height={1024}/>
      {facts?.meaning && <p className="mnemonic-dialog-meaning">{facts.meaning}</p>}
      <DialogDescription className="mnemonic-dialog-note">Memory helper for <span lang="zh-CN">{mnemonic.glyph}</span> · not its etymology.</DialogDescription>
    </DialogContent>
  </Dialog></span>;
}

export function TileMnemonicButton({ mnemonic, facts }: { mnemonic: Mnemonic; facts?: MnemonicFacts }) {
  const [open, setOpen] = useState(false);
  const activate = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); setOpen(true); };
  return <>
    <span role="button" tabIndex={0} className="tile-mnemonic" aria-label={`Show the memory picture for ${mnemonic.glyph}`} title="Memory picture"
      onClick={activate} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}><ImageIcon/></span>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen} facts={facts}/>}
  </>;
}

/** `labelled`: the picture belongs to another form of the family (辶 shown on 辵), so a corner chip
 *  names that form and the picture is never read as the selected form's own. */
export function MnemonicPreview({ mnemonic, labelled = false, facts }: { mnemonic: Mnemonic; labelled?: boolean; facts?: MnemonicFacts }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="mnemonic-preview" aria-label={`Enlarge the memory picture for ${mnemonic.glyph}`} title={labelled ? `Memory picture for ${mnemonic.glyph} · click to enlarge` : 'Memory picture · click to enlarge'} onClick={() => setOpen(true)}>
      <img src={mnemonic.url} alt="" width={1024} height={1024} loading="lazy" decoding="async"/>
      {labelled && <span className="mnemonic-preview-form" lang="zh-CN" aria-hidden="true">{mnemonic.glyph}</span>}
    </button>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen} facts={facts}/>}
  </>;
}
