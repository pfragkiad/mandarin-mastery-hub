import { createFileRoute } from '@tanstack/react-router';
import { StrokesPage } from '@/components/tutor/writing-practice';
import { StrokePractice } from '@/components/tutor/stroke-practice';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/strokes')({ validateSearch: (search: Record<string, unknown>): { character?: string; focus?: number; stroke?: string } => { const focus = Number(search['focus']); return { ...(typeof search['stroke'] === 'string' && search['stroke'] ? { stroke: search['stroke'] } : {}), ...(typeof search['character'] === 'string' && search['character'] ? { character: search['character'] } : {}), ...(Number.isInteger(focus) && focus > 0 ? { focus } : {}) }; }, head: () => pageHead('Writing practice', 'Watch authentic Chinese stroke order and practice writing Mandarin characters one stroke at a time.'), component: StrokesRoute });
function StrokesRoute() { const { character, focus, stroke } = Route.useSearch(); return stroke ? <StrokePractice key={stroke} glyph={stroke}/> : <StrokesPage key={character ?? '我'} initialCharacter={character ?? '我'} focus={focus ?? 0}/>; }
