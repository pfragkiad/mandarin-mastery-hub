import { Link } from '@tanstack/react-router';
import { Brush, ChevronDown, Layers, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { DrawingSearch } from '@/lib/drawing-game';

export function LibraryPlayMenu({ category, drawing }: { category?: string | undefined; drawing: DrawingSearch }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Play/>Play<ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="start">
    <DropdownMenuItem asChild><Link to="/flashcards" search={category ? { category } : {}}><Layers/>Flashcards</Link></DropdownMenuItem>
    <DropdownMenuItem asChild><Link to="/drawing" search={drawing}><Brush/>Drawing game</Link></DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}