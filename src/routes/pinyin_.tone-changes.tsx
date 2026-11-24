import { createFileRoute } from '@tanstack/react-router';
import { ToneSoundsPage } from '@/components/tutor/tone-pairs-page';
import { pageHead } from '@/lib/mandarin';
import { validateToneChangesSearch } from '@/lib/tone-pairs';

// Tone changes (Pinyin sounds): 3 + 3, 一 and 不. URL search keeps the rule, the exact example,
// Listen first and speed. Choosing a rule or word pushes history; Listen first and speed replace it.
export const Route = createFileRoute('/pinyin_/tone-changes')({
  validateSearch: validateToneChangesSearch,
  head: () => pageHead('Tone changes', 'Hear how Mandarin tones change in context: two third tones, 一 and 不, in real whole-word recordings.'),
  component: ToneChangesRoute,
});

function ToneChangesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <ToneSoundsPage mode="changes" search={search}
    onChange={(patch, replace = false) => navigate({ search: prev => ({ ...prev, ...patch }), resetScroll: false, replace })}/>;
}
