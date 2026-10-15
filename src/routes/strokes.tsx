import { createFileRoute } from '@tanstack/react-router';
import { StrokesPage } from '@/components/tutor/writing-practice';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/strokes')({ validateSearch: (search: Record<string, unknown>): { character?: string; focus?: number } => { const focus = Number(search['focus']); return { ...(typeof search['character'] === 'string' && search['character'] ? { character: search['character'] } : {}), ...(Number.isInteger(focus) && focus > 0 ? { focus } : {}) }; }, head: () => pageHead('Writing practice', 'Watch authentic Chinese stroke order and practice writing Mandarin characters one stroke at a time.'), component: StrokesRoute });
function StrokesRoute() { const { character, focus } = Route.useSearch(); return <StrokesPage key={character ?? '我'} initialCharacter={character ?? '我'} focus={focus ?? 0}/>; }
