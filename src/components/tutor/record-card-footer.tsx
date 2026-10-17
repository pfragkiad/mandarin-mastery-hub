import { Bookmark, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export function RecordCardFooter({ metadata, hanzi, bookmarked, onBookmark, audioAvailable, audioTitle, onListen }: {
  metadata: ReactNode;
  hanzi: string;
  bookmarked: boolean;
  onBookmark: () => void;
  audioAvailable: boolean;
  audioTitle?: string;
  onListen: () => void;
}) {
  return <div className="word-card-bottom"><span>{metadata}</span><div className="word-actions">
    <Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? audioTitle : undefined} aria-label={audioAvailable ? `Listen to ${hanzi}` : `No audio available for ${hanzi}`} onClick={onListen}><Volume2/></Button>
    <Button variant="ghost" size="icon" title={bookmarked ? 'Remove bookmark' : 'Bookmark record'} aria-label={`${bookmarked ? 'Unsave' : 'Save'} ${hanzi}`} aria-pressed={bookmarked} onClick={onBookmark}><Bookmark className={bookmarked ? 'bookmark-saved' : ''}/></Button>
  </div></div>;
}