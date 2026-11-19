import { useState, type SyntheticEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
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
 */
export function MnemonicDialog({ mnemonic, open, onOpenChange }: { mnemonic: Mnemonic; open: boolean; onOpenChange: (open: boolean) => void }) {
  // React events from the portal still bubble through this component's ancestors (the grid card's
  // face button, the DetailSheet's arrow-key handler), so the scope span stops them here.
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return <span className="mnemonic-dialog-scope" onClick={stop} onDoubleClick={stop} onKeyDown={stop} onPointerDown={stop}><Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="mnemonic-dialog">
      <DialogTitle className="mnemonic-dialog-title"><strong lang="zh-CN">{mnemonic.glyph}</strong><span>Memory picture</span></DialogTitle>
      <img className="mnemonic-dialog-image" src={mnemonic.url} alt={mnemonic.caption ?? `Memory picture for ${mnemonic.glyph}`} width={1024} height={1024}/>
      <DialogDescription className="mnemonic-dialog-note">A memory aid for this form, not its etymology.</DialogDescription>
    </DialogContent>
  </Dialog></span>;
}

export function TileMnemonicButton({ mnemonic }: { mnemonic: Mnemonic }) {
  const [open, setOpen] = useState(false);
  const activate = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); setOpen(true); };
  return <>
    <span role="button" tabIndex={0} className="tile-mnemonic" aria-label={`Show the memory picture for ${mnemonic.glyph}`} title="Memory picture"
      onClick={activate} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}><ImageIcon/></span>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen}/>}
  </>;
}

export function MnemonicPreview({ mnemonic }: { mnemonic: Mnemonic }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="mnemonic-preview" aria-label={`Enlarge the memory picture for ${mnemonic.glyph}`} title="Memory picture · click to enlarge" onClick={() => setOpen(true)}>
      <img src={mnemonic.url} alt="" width={1024} height={1024} loading="lazy" decoding="async"/>
    </button>
    {open && <MnemonicDialog mnemonic={mnemonic} open={open} onOpenChange={setOpen}/>}
  </>;
}
