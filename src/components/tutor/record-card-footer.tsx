import { Bookmark, PenLine, GraduationCap, Maximize2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { PracticeMode } from '@/lib/practice-mode';
import type { ReactNode } from 'react';

export type PracticeSearch = { character?: string; stroke?: string; family?: number; variant?: string; mode?: PracticeMode };

export function RecordCardFooter({ metadata, hanzi, bookmarked, onBookmark, practice, onDetails }: {
  metadata: ReactNode;
  hanzi: string;
  bookmarked: boolean;
  onBookmark: () => void;
  practice?: PracticeSearch;
  /** Hide modes only: opens the detail panel directly, without revealing the card first. */
  onDetails?: () => void;
}) {
  const target = practice ?? { character: hanzi };
  return <div className="word-card-bottom"><span>{metadata}</span><div className="word-actions">
    {onDetails && <Button variant="ghost" size="icon" className="card-details-action" title="Open details (shows everything)" aria-label={`Open details for ${hanzi}`} onClick={onDetails}><Maximize2/></Button>}
    <Button asChild variant="ghost" size="icon" title="Practice writing"><Link to="/strokes" search={target} aria-label={`Practice writing ${hanzi}`}><PenLine/></Link></Button>
    <Button asChild variant="ghost" size="icon" title="Practice Expert — Recall mode"><Link to="/strokes" search={{ ...target, mode: 'recall' }} aria-label={`Practice Expert (Recall) ${hanzi}`}><GraduationCap/></Link></Button>
    <Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark record'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${hanzi}`} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button>
  </div></div>;
}
