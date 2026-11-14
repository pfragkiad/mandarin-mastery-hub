import { Bookmark } from 'lucide-react';
import { DetailsIcon, ExpertPracticeIcon, PracticeIcon } from './practice-icons';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { PracticeMode } from '@/lib/practice-mode';
import type { ReactNode, SyntheticEvent } from 'react';

export type PracticeSearch = { character?: string; stroke?: string; family?: number; variant?: string; mode?: PracticeMode };

/**
 * CardTopMeta repeats the footer metadata (rank · strokes, word type) inside the
 * card's top label row, prefixed by a dot. It is display:none everywhere except
 * Comfortable cards (and Compact word cards), where the footer text is hidden instead,
 * so only one copy is ever visible or read aloud.
 */
export function CardTopMeta({ children }: { children: ReactNode }) {
  return <span className="card-top-meta"><span aria-hidden="true">· </span>{children}</span>;
}

/**
 * Bookmark toggle embedded in a Comfortable card's clickable face, at the far right of
 * the pinyin line. The face is a real <button>, so like TileSpeaker this is a
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
    aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${hanzi}`}
    aria-pressed={bookmarked}
    title={bookmarked ? 'Remove bookmark' : 'Bookmark record'}
    className="tile-speaker tile-bookmark"
    onClick={activate}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}
  ><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></span>;
}

/**
 * Card footer shared by Glyphs and Vocabulary cards.
 * - Compact: four icon actions (Details only in Hide modes, Practice, Expert, Save).
 * - Comfortable (`comfortable`): one row of labelled Details / Trace / Recall buttons,
 *   the same trio as Start's random cards (shared .daily-hero-actions). Save moves to
 *   the card face (TileBookmark), so the translation gets the freed width. Details uses
 *   `onDetails` when the card is in a Hide mode, otherwise `onOpen` (the face's own open).
 */
export function RecordCardFooter({ metadata, hanzi, bookmarked, onBookmark, practice, onDetails, comfortable = false, onOpen }: {
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
}) {
  const target = practice ?? { character: hanzi };
  if (comfortable) {
    const openDetails = onDetails ?? onOpen;
    return <div className="word-card-bottom"><span>{metadata}</span><div className="daily-hero-actions card-labelled-actions">
      {openDetails && <Button variant="outline" size="sm" className="card-details-action" aria-label={`Open details for ${hanzi}`} onClick={openDetails}><DetailsIcon aria-hidden="true"/>Details</Button>}
      <Button asChild variant="outline" size="sm" className="card-practice-action"><Link to="/strokes" search={{ ...target, mode: 'trace' }} aria-label={`Trace ${hanzi}`}><PracticeIcon aria-hidden="true"/>Trace</Link></Button>
      <Button asChild variant="outline" size="sm" className="card-expert-action"><Link to="/strokes" search={{ ...target, mode: 'recall' }} aria-label={`Recall ${hanzi}`}><ExpertPracticeIcon aria-hidden="true"/>Recall</Link></Button>
    </div></div>;
  }
  return <div className="word-card-bottom"><span>{metadata}</span><div className="word-actions">
    {onDetails && <Button variant="ghost" size="icon" className="card-details-action" title="Open details (shows everything)" aria-label={`Open details for ${hanzi}`} onClick={onDetails}><DetailsIcon/></Button>}
    <Button asChild variant="ghost" size="icon" className="card-practice-action" title="Practice writing"><Link to="/strokes" search={{ ...target, mode: 'trace' }} aria-label={`Practice writing ${hanzi}`}><PracticeIcon/></Link></Button>
    <Button asChild variant="ghost" size="icon" className="card-expert-action" title="Practice Expert — Recall mode"><Link to="/strokes" search={{ ...target, mode: 'recall' }} aria-label={`Practice Expert (Recall) ${hanzi}`}><ExpertPracticeIcon/></Link></Button>
    <Button variant="ghost" size="icon" className="card-bookmark-action" title={bookmarked ? 'Remove bookmark' : 'Bookmark record'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${hanzi}`} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button>
  </div></div>;
}
