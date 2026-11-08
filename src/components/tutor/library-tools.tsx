import { Link } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import { PracticeIcon } from './practice-icons';
import { Button } from '@/components/ui/button';
import type { DrawingSearch } from '@/lib/drawing-game';
import { CardRevealToggle } from './card-reveal-toggle';
import { LibraryPlayMenu } from './library-play-menu';
import { useSmallLibraryScreen } from './use-small-library-screen';

/** Shared actions swap desktop menus for one phone sheet, preserving exact game destinations. */
export function LibraryTools({ category, drawing }: { category?: string | undefined; drawing?: DrawingSearch | undefined }) {
  const small = useSmallLibraryScreen();
  return <div className="catalog-tools-row">{small ? <CardRevealToggle study playOptions={drawing ? <><Button asChild variant="ghost"><Link to="/flashcards" search={category ? { category } : {}}><Layers/>Flashcards</Link></Button><Button asChild variant="ghost"><Link to="/drawing" search={drawing}><PracticeIcon/>Drawing game</Link></Button></> : undefined}/> : <>{drawing && <LibraryPlayMenu category={category} drawing={drawing}/>}<CardRevealToggle/></>}</div>;
}