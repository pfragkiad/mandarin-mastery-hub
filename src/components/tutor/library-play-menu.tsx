import { Link } from '@tanstack/react-router';
import { Brush, ChevronDown, Play } from 'lucide-react';
import { FlashcardsIcon } from './game-catalog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { DrawingSearch } from '@/lib/drawing-game';
import type { FlashcardFilters } from './flashcards';

export function LibraryPlayMenu({ flashcards, drawing }: { flashcards?: Partial<FlashcardFilters> | undefined; drawing: DrawingSearch }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Play/>Play<ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="start">
    <DropdownMenuItem asChild><Link to="/flashcards" search={flashcards ?? {}}><FlashcardsIcon/>Flashcards</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to="/drawing" search={drawing}><Brush/>Drawing game</Link></DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}