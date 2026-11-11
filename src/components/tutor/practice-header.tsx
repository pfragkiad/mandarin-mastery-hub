import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, MoreHorizontal, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { focusEntryCard, originLabel, practiceOrigin } from '@/lib/practice-return';

// Practice title card, shared by character, word and stroke practice.
// Layout: a top row with Back (named after the page Practice was opened from) and the
// print action (a "•••" menu on phones), then "Write <glyph>" with the reading line under
// it on the left and, when the record has other forms, the form switch on the right.
// Inputs:
// - glyph / glyphClassName: the title glyph and its identity ink (card-ink-*, is-traditional).
// - hideGlyph: Recall keeps the glyph only for screen readers so the answer never shows.
// - reading: pinyin + speaker(s); meaning: the translation; pills: Radical #N / kind pills.
// - forms: ScriptForms / RadicalForms in their "switch" layout; omitted when there is only
//   one form, so a simplified-only record shows no tiles.
// - after: notes shown under the reading line (e.g. an audio error).
// No state of its own: Back reads the session origin remembered by practice-return.ts.
export function PracticeHeader({ glyph, glyphClassName = '', hideGlyph = false, reading, meaning, pills, forms, onPrint, printDisabled = false, after }: { glyph: string; glyphClassName?: string; hideGlyph?: boolean; reading: ReactNode; meaning: ReactNode; pills?: ReactNode; forms?: ReactNode; onPrint: () => void; printDisabled?: boolean; after?: ReactNode }) {
  const navigate = useNavigate();
  const origin = practiceOrigin();
  const back = () => { if (origin) { void navigate({ href: origin }); focusEntryCard(); } else void navigate({ to: '/characters' }); };
  return <header className={`practice-header${forms ? ' has-forms' : ''}`}>
    <div className="practice-header-top">
      <Button variant="ghost" size="sm" className="practice-back" onClick={back}><ArrowLeft/>{originLabel(origin)}</Button>
      <Button variant="outline" size="sm" className="practice-print-button" disabled={printDisabled} onClick={onPrint}><Printer/>Print sheet</Button>
      {/* Phones keep the same action behind a compact overflow menu. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="practice-more-button" aria-label="More actions"><MoreHorizontal/></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem disabled={printDisabled} onSelect={onPrint}><Printer/>Print sheet</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </div>
    <div className="practice-header-main">
      <div className="practice-header-text">
        <h1 className="practice-title">Write{' '}<span lang="zh-CN" className={`practice-title-glyph ${glyphClassName}${hideGlyph ? ' sr-only' : ''}`}>{glyph}</span></h1>
        <p className="practice-reading-line">{reading}<span className="practice-reading-dot" aria-hidden="true">·</span><span className="practice-translation">{meaning}</span>{pills}</p>
        {after}
      </div>
      {forms && <div className="practice-header-forms">{forms}</div>}
    </div>
  </header>;
}
