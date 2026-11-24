import { createFileRoute } from '@tanstack/react-router';
import { ToneSoundsPage } from '@/components/tutor/tone-pairs-page';
import { pageHead } from '@/lib/mandarin';
import { validateTonePairsSearch } from '@/lib/tone-pairs';

// Tone pairs (Pinyin sounds): URL search keeps the dictionary pair, the exact example, Listen
// first and speed. Choosing a pair or word pushes history; Listen first and speed replace it.
export const Route = createFileRoute('/pinyin_/tone-pairs')({
  validateSearch: validateTonePairsSearch,
  head: () => pageHead('Tone pairs', 'Hear Mandarin two-syllable words by tone pair, recorded by a real speaker, with slow playback and listen-first practice.'),
  component: TonePairsRoute,
});

function TonePairsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <ToneSoundsPage mode="pairs" search={search}
    onChange={(patch, replace = false) => navigate({ search: prev => ({ ...prev, ...patch }), resetScroll: false, replace })}/>;
}
