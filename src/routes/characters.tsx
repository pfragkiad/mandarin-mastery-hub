import { createFileRoute } from '@tanstack/react-router';
import { CharactersPage } from '@/components/tutor/characters-page';
import { pageHead } from '@/lib/mandarin';

export const Route = createFileRoute('/characters')({
  validateSearch: (search: Record<string, unknown>): { character?: string } => ({
    character: typeof search['character'] === 'string' && search['character'] ? search['character'] : undefined,
  }),
  head: () => pageHead('Characters', 'Browse every character, radical and component, then open one to practise writing it stroke by stroke.'),
  component: () => {
    const { character } = Route.useSearch();
    return <CharactersPage {...(character ? { initialGlyph: character } : {})} />;
  },
});
