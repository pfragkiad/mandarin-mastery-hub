import { createFileRoute } from '@tanstack/react-router';
import { StrokesPage } from '@/components/tutor/writing-practice';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/strokes')({ validateSearch: (search: Record<string, unknown>): { character?: string } => (typeof search['character'] === 'string' && search['character'] ? { character: search['character'] } : {}), head: () => pageHead('Writing practice', 'Watch authentic Chinese stroke order and practice writing Mandarin characters one stroke at a time.'), component: StrokesRoute });
function StrokesRoute() { const { character } = Route.useSearch(); return <StrokesPage key={character ?? '我'} initialCharacter={character ?? '我'}/>; }
