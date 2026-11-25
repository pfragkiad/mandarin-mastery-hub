import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PracticeIcon } from './practice-icons';
import { FlashcardsIcon } from './game-catalog';
import { Button } from '@/components/ui/button';
import type { DrawingSearch } from '@/lib/drawing-game';
import type { FlashcardFilters } from './flashcards';
import { CardRevealToggle } from './card-reveal-toggle';
import { LibraryPlayMenu } from './library-play-menu';
import { useSmallLibraryScreen } from './use-small-library-screen';

/** Shared actions swap desktop menus for one phone sheet, preserving exact game destinations.
 * `flashcards` is the Flashcards search (kind, collection, level…) matching the library's current view. */
export function LibraryTools({ flashcards, drawing, sort }: { flashcards?: Partial<FlashcardFilters> | undefined; drawing?: DrawingSearch | undefined; sort?: ReactNode }) {
  const small = useSmallLibraryScreen();
  const playOptions = drawing
    ? <><Button asChild variant="ghost"><Link to="/flashcards" search={flashcards ?? {}}><FlashcardsIcon/>Flashcards</Link></Button><Button asChild variant="ghost"><Link to="/drawing" search={drawing}><PracticeIcon/>Drawing game</Link></Button></>
    : flashcards
      ? <Button asChild variant="ghost"><Link to="/flashcards" search={flashcards}><FlashcardsIcon/>Play Flashcards</Link></Button>
      : undefined;
  const desktopPlay = drawing
    ? <LibraryPlayMenu flashcards={flashcards} drawing={drawing}/>
    : flashcards
      ? <Button asChild variant="outline" size="sm"><Link to="/flashcards" search={flashcards}><FlashcardsIcon/>Play Flashcards</Link></Button>
      : null;
  return <div className="catalog-tools-row">{sort}{small ? <CardRevealToggle study playOptions={playOptions}/> : <>{desktopPlay}<CardRevealToggle/></>}</div>;
}