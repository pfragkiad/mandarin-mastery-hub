import type { ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { radicalDisplayGlyph } from '@/lib/radical-display-glyph';
import { HintBody } from './source-info';

// Formatted hover/focus hint for a form box whose exact radical symbol is drawn with a reviewed
// stand-in shape (⺴ shown as 冗, src/lib/radical-display-glyph.ts). Inputs: `glyph`, the exact
// symbol, and `children`, the one focusable/hoverable element to attach to (the box's link or
// span). Glyphs without a stand-in get their child back untouched, so ordinary boxes keep their
// own title hints. The card reuses the library tile tooltip look: a head row with the exact
// symbol → stand-in and its label, the explanation as divided hint rows, and a small source line.
export function StandInHint({ glyph, children }: { glyph: string; children: ReactElement }) {
  const stand = radicalDisplayGlyph(glyph);
  if (!stand) return children;
  return <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="bottom" className="tile-tooltip stand-in-hint">
      <span className="tile-tooltip-head"><strong lang="zh-CN">{glyph}</strong><span aria-hidden="true">→</span><strong lang="zh-CN">{stand.shown}</strong><span className="stand-in-hint-label">{stand.label}</span></span>
      <HintBody className="tile-tooltip-meaning">{stand.rows.flatMap((row, index) => index ? [<br key={`b${index}`}/>, row] : [row])}</HintBody>
      <span className="stand-in-hint-source">{stand.source}</span>
    </TooltipContent>
  </Tooltip>;
}
