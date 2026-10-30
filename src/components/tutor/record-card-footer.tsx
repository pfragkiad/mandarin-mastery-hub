import { Bookmark, PenLine } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export type PracticeSearch = { character?: string; stroke?: string; family?: number; variant?: string };

export function RecordCardFooter({ metadata, hanzi, bookmarked, onBookmark, practice }: {
  metadata: ReactNode;
  hanzi: string;
  bookmarked: boolean;
  onBookmark: () => void;
  practice?: PracticeSearch;
}) {
  return <div className="word-card-bottom"><span>{metadata}</span><div className="word-actions">
    <Button asChild variant="ghost" size="icon" title="Practice writing"><Link to="/strokes" search={practice ?? { character: hanzi }} aria-label={`Practice writing ${hanzi}`}><PenLine style={{ width: 12, height: 12 }}/></Link></Button>
    <Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark record'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${hanzi}`} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button>
  </div></div>;
}
