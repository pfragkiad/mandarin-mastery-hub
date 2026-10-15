import { createFileRoute } from '@tanstack/react-router';
import { StrokesPage } from '@/components/tutor/writing-practice';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/strokes')({ validateSearch: (search: Record<string, unknown>): { character?: string } => ({ character: typeof search.character === 'string' ? Array.from(search.character)[0] : undefined }), head: () => pageHead('Stroke practice', 'Watch authentic Chinese stroke order and practice writing Mandarin characters.'), component: StrokesRoute });
function StrokesRoute() { const { character } = Route.useSearch(); return <StrokesPage key={character ?? '我'} initialCharacter={character}/>; }
