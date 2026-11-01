import { Link } from '@tanstack/react-router';
import { ChevronDown, Layers, PenLine, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { DrawingSearch } from '@/lib/drawing-game';

export function LibraryPlayMenu({ category, drawing }: { category?: string; drawing: DrawingSearch }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Play/>Play<ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="start">
    <DropdownMenuItem asChild><Link to="/flashcards" search={category ? { category } : {}}><Layers/>Flashcards</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to="/drawing" search={drawing}><PenLine/>Drawing game</Link></DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}