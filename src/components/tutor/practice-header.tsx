import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, MoreHorizontal, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { focusEntryCard, originLabel, practiceOrigin } from '@/lib/practice-return';
import { detailTrail } from '@/lib/detail-trail';
import type { CharactersSearch } from './characters-page';
import type { VocabularySearch } from '@/routes/vocabulary';
import { DetailsIcon } from './practice-icons';

/** Where the title's details link leads: the practised record's own library card — a Glyphs
 *  card (tab + exact record id, plus the family form key for a radical variant, which the
 *  radical card focuses) or a Vocabulary word/phrase. Built by the caller from exact record
 *  membership, never from shape. */
export type PracticeDetails = { to: '/characters'; search: CharactersSearch } | { to: '/vocabulary'; search: VocabularySearch };

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
// - details: the practised record's library card; a details icon beside "Write <glyph>"
//   opens it, leaving this practice page as the details window's Back step.
// State: only Back's label, read from the session origin (practice-return.ts) after mount —
// the server has no session storage, so reading it during render would mismatch hydration.
export function PracticeHeader({ glyph, glyphClassName = '', hideGlyph = false, reading, meaning, pills, forms, onPrint, printDisabled = false, after, details }: { details?: PracticeDetails | undefined; glyph: string; glyphClassName?: string; hideGlyph?: boolean; reading: ReactNode; meaning: ReactNode; pills?: ReactNode; forms?: ReactNode; onPrint: () => void; printDisabled?: boolean; after?: ReactNode }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => { setOrigin(practiceOrigin()); }, [glyph]);
  const back = () => { const origin = practiceOrigin(); if (origin) { void navigate({ href: origin }); focusEntryCard(); } else void navigate({ to: '/characters' }); };
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
    {/* Title on its own line; under it the form tiles (when any) sit on the left and the
        reading block fills the rest: pinyin + speaker with the pills pushed right, then the
        translation on its own line so it wraps across the full remaining width. */}
    <div className="practice-title-row">
      <h1 className="practice-title">Write{' '}<span lang="zh-CN" className={`practice-title-glyph ${glyphClassName}${hideGlyph ? ' sr-only' : ''}`}>{glyph}</span></h1>
      {details && <PracticeDetailsLink details={details} glyph={glyph} hideGlyph={hideGlyph}/>}
    </div>
    <div className="practice-header-main">
      {forms && <div className="practice-header-forms">{forms}</div>}
      <div className="practice-header-text">
        <p className="practice-reading-line"><span className="practice-reading">{reading}</span>{pills}</p>
        <p className="practice-translation-line"><span className="practice-translation">{meaning}</span></p>
        {after}
      </div>
    </div>
  </header>;
}

// The details icon beside the title. Recall names no glyph in its hint so the answer stays
// hidden until the learner chooses to open the card. Clicking leaves this practice page as
// the only details-trail step, so the window's Back returns here (as Decomposition links do).
function PracticeDetailsLink({ details, glyph, hideGlyph }: { details: PracticeDetails; glyph: string; hideGlyph: boolean }) {
  const hint = hideGlyph ? 'Open the detail card' : `Open the detail card for ${glyph}`;
  const note = () => detailTrail.replace({ label: hideGlyph ? 'Practice' : `Practice (${glyph})`, href: window.location.href });
  const common = { className: 'practice-details-link', title: hint, 'aria-label': hint, onClick: note, children: <DetailsIcon aria-hidden="true"/> };
  return details.to === '/characters'
    ? <Link to="/characters" search={details.search} {...common}/>
    : <Link to="/vocabulary" search={details.search} {...common}/>;
}
