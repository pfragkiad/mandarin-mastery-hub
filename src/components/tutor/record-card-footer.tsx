import { Bookmark, PenLine } from 'lucide-react';
import { DetailsIcon, ExpertPracticeIcon, PracticeIcon } from './practice-icons';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { PracticeMode } from '@/lib/practice-mode';
import type { ReactNode, RefObject, SyntheticEvent } from 'react';

export type PracticeSearch = { character?: string; stroke?: string; family?: number; variant?: string; mode?: PracticeMode };

/**
 * CardTopMeta repeats the footer metadata (rank · strokes, word type) inside the
 * card's top label row, prefixed by a dot when a label precedes it. Glyph cards and
 * Words cards show it in both Compact and Comfortable (the footer text is hidden
 * instead), so only one copy is ever visible or read aloud.
 */
export function CardTopMeta({ children, lead = false }: { children: ReactNode; lead?: boolean }) {
  // `lead`: the metadata opens the label row (no category word before it), so it drops the dot.
  return <span className={`card-top-meta${lead ? ' is-lead' : ''}`}>{!lead && <span aria-hidden="true">· </span>}{children}</span>;
}

/**
 * One wording for every bookmark toggle (cards, detail panels, Start, game results):
 * the action is "Bookmark", undoing it is "Remove bookmark". `hanzi` names the record
 * for screen readers; omit it for a visible button label.
 */
export function bookmarkLabel(bookmarked: boolean, hanzi?: string) {
  const action = bookmarked ? 'Remove bookmark' : 'Bookmark';
  return hanzi ? `${action} ${hanzi}` : action;
}

/** Hover hint for every bookmark toggle: says what a bookmark is for (the study list). */
export function bookmarkHint(bookmarked: boolean) {
  return bookmarked ? 'Remove bookmark' : 'Bookmark · add to study list';
}

/**
 * Bookmark toggle embedded in a clickable card face (Start's random cards), at the far
 * right of the pinyin line. The face is a real <button>, so like TileSpeaker this is a
 * role="button" span that swallows activation (the card neither opens nor reveals).
 * Inputs: the record's hanzi (for the label), its saved state and the toggle callback.
 */
export function TileBookmark({ hanzi, bookmarked, onBookmark }: { hanzi: string; bookmarked: boolean; onBookmark: () => void }) {
  const activate = (event: SyntheticEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onBookmark();
  };
  return <span
    role="button"
    tabIndex={0}
    aria-label={bookmarkLabel(bookmarked, hanzi)}
    aria-pressed={bookmarked}
    title={bookmarkHint(bookmarked)}
    className="tile-speaker tile-bookmark"
    onClick={activate}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}
  ><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></span>;
}

/**
 * Card footer shared by Glyphs and Vocabulary cards.
 * - Compact: icon actions (Details only in Hide modes, Trace, Recall) left-aligned,
 *   with the bookmark as a separate icon pushed to the row's right end.
 * - Comfortable (`comfortable`): one row of labelled Details / Trace / Recall buttons,
 *   the same trio as Start's random cards (shared .daily-hero-actions), then the bookmark
 *   as an unlabelled icon button at the row's right end, as tall as the labelled buttons.
 *   Recall and the bookmark share one non-wrapping group, so a narrow card wraps as
 *   "Details Trace / Recall … bookmark" and never leaves the bookmark alone on a line.
 *   Both modes keep the bookmark at the far right so its spot is predictable. Details uses
 *   `onDetails` when the card is in a Hide mode, otherwise `onOpen` (the face's own open).
 */
export function RecordCardFooter({ metadata, hanzi, bookmarked, onBookmark, practice, onDetails, comfortable = false, onOpen, footerRef }: {
  metadata: ReactNode;
  hanzi: string;
  bookmarked: boolean;
  onBookmark: () => void;
  practice?: PracticeSearch;
  /** Hide modes only: opens the detail panel directly, without revealing the card first. */
  onDetails?: () => void;
  comfortable?: boolean;
  /** Comfortable only: what the card face does when no Hide mode applies (opens details). */
  onOpen?: () => void;
  /** Library cards pass the row's ref so the button row can measure its own wrap (use-card-footer-fit.ts). */
  footerRef?: RefObject<HTMLDivElement | null>;
}) {
  const target = practice ?? { character: hanzi };
  if (comfortable) {
    const openDetails = onDetails ?? onOpen;
    return <div className="word-card-bottom" ref={footerRef}><span>{metadata}</span><div className="daily-hero-actions card-labelled-actions">
      {openDetails && <Button variant="outline" size="sm" className="card-details-action" aria-label={`Open details for ${hanzi}`} onClick={openDetails}><DetailsIcon aria-hidden="true"/>Details</Button>}
      <Button asChild variant="outline" size="sm" className="card-practice-action"><Link to="/strokes" search={{ ...target, mode: 'trace' }} aria-label={`Trace ${hanzi}`}><PracticeIcon aria-hidden="true"/>Trace</Link></Button>
      {/* Recall and the bookmark wrap as one unit: when the row is too narrow, Recall moves
          down with the bookmark, so the bookmark never sits alone on a second line. */}
      <span className="card-actions-tail">
        <Button asChild variant="outline" size="sm" className="card-expert-action"><Link to="/strokes" search={{ ...target, mode: 'recall' }} aria-label={`Recall ${hanzi}`}><ExpertPracticeIcon aria-hidden="true"/>Recall</Link></Button>
        {/* A plain toggle icon (no button frame), like every other bookmark; filled when saved. */}
        <Button variant="ghost" size="sm" className="card-bookmark-action card-bookmark-icon" title={bookmarkHint(bookmarked)} aria-label={bookmarkLabel(bookmarked, hanzi)} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''} aria-hidden="true"/></Button>
      </span>
    </div></div>;
  }
  return <div className="word-card-bottom" ref={footerRef}><span>{metadata}</span><div className="word-actions card-footer-actions">
    {onDetails && <Button variant="outline" size="sm" className="card-details-action" aria-label={`Open details for ${hanzi}`} onClick={onDetails}><DetailsIcon aria-hidden="true"/>Details</Button>}
    <Button asChild variant="outline" size="sm" className="card-practice-action"><Link to="/strokes" search={{ ...target, mode: 'trace' }} aria-label={`Trace ${hanzi}`}><PracticeIcon aria-hidden="true"/>Trace</Link></Button>
    <Button asChild variant="outline" size="sm" className="card-expert-action"><Link to="/strokes" search={{ ...target, mode: 'recall' }} aria-label={`Recall ${hanzi}`}><ExpertPracticeIcon aria-hidden="true"/>Recall</Link></Button>
  </div><Button variant="ghost" size="icon" className="card-bookmark-action card-footer-bookmark" title={bookmarkHint(bookmarked)} aria-label={bookmarkLabel(bookmarked, hanzi)} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button></div>;
}

/**
 * Action row of a Glyphs/Vocabulary detail panel: Trace and Recall (the same labelled
 * buttons as Comfortable cards) plus a labelled Bookmark toggle.
 * Inputs: the Practice target, the record's hanzi, its bookmark state and toggle, and an
 * optional `onNavigate` (the panel closes itself before Practice opens).
 * `similar` (glyph details only, when the finder has this exact glyph's recorded
 * strokes) adds "Find similar", opening the Hanzi finder with those strokes on the board.
 */
export function DetailRecordActions({ practice, hanzi, bookmarked, onBookmark, onNavigate, similar }: { practice: PracticeSearch; hanzi: string; bookmarked: boolean; onBookmark: () => void; onNavigate?: () => void; similar?: string }) {
  return <div className="word-detail-actions">
    <Button asChild variant="outline" size="sm" className="card-practice-action"><Link to="/strokes" search={{ ...practice, mode: 'trace' }} aria-label={`Trace ${hanzi}`} onClick={onNavigate}><PracticeIcon aria-hidden="true"/>Trace</Link></Button>
    <Button asChild variant="outline" size="sm" className="card-expert-action"><Link to="/strokes" search={{ ...practice, mode: 'recall' }} aria-label={`Recall ${hanzi}`} onClick={onNavigate}><ExpertPracticeIcon aria-hidden="true"/>Recall</Link></Button>
    {similar && <Button asChild variant="outline" size="sm" className="detail-similar-action"><Link to="/finder" search={{ similar }} title={`Hanzi finder · glyphs whose recorded strokes look like ${similar}`} onClick={onNavigate}><PenLine aria-hidden="true"/>Find similar</Link></Button>}
    <Button variant="outline" size="sm" className="detail-bookmark-action" title={bookmarkHint(bookmarked)} aria-label={bookmarkLabel(bookmarked, hanzi)} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark aria-hidden="true" className={bookmarked ? 'bookmark-saved' : ''}/>{bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
  </div>;
}
