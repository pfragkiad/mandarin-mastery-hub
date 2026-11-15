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
export function LibraryTools({ flashcards, drawing }: { flashcards?: Partial<FlashcardFilters> | undefined; drawing?: DrawingSearch | undefined }) {
  const small = useSmallLibraryScreen();
  return <div className="catalog-tools-row">{small ? <CardRevealToggle study playOptions={drawing ? <><Button asChild variant="ghost"><Link to="/flashcards" search={flashcards ?? {}}><FlashcardsIcon/>Flashcards</Link></Button><Button asChild variant="ghost"><Link to="/drawing" search={drawing}><PracticeIcon/>Drawing game</Link></Button></> : undefined}/> : <>{drawing && <LibraryPlayMenu flashcards={flashcards} drawing={drawing}/>}<CardRevealToggle/></>}</div>;
}