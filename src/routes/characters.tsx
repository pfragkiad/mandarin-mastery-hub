import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CharactersPage, type CharactersSearch } from '@/components/tutor/characters-page';
import { pageHead } from '@/lib/mandarin';
import { reuseGroups } from '@/lib/component-reuse';

const kindValues = ['Characters', 'Radicals', 'Components', 'Strokes'] as const;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export const Route = createFileRoute('/characters')({
  validateSearch: (search: Record<string, unknown>): CharactersSearch => {
    const out: CharactersSearch = {};
    const character = str(search['character']); if (character) out.character = character;
    const tab = kindValues.find(k => k === search['tab']); if (tab) out.tab = tab;
    const reuse = reuseGroups.find(group => group.value === search['reuse']); if (reuse) out.reuse = reuse.value;
    if (search['status'] === 'saved') out.status = 'saved';
    const q = str(search['q']); if (q) out.q = q;
    const strokes = str(typeof search['strokes'] === 'number' ? String(search['strokes']) : search['strokes']); if (strokes) out.strokes = strokes;
    const page = Number(search['page']); if (Number.isInteger(page) && page > 1) out.page = page;
    const id = str(search['id']); if (id) out.id = id;
    return out;
  },
  head: () => pageHead('Glyphs', 'Browse characters, radicals, components and strokes, then open one to practise writing it stroke by stroke.'),
  component: CharactersRoute,
});

function CharactersRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/characters' });
  return <CharactersPage search={search} onSearch={(next, replace) => navigate({ search: next, replace: Boolean(replace), resetScroll: false })} />;
}
