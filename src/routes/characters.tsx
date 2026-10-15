import { createFileRoute } from '@tanstack/react-router';
import { CharactersPage } from '@/components/tutor/characters-page';
import { pageHead } from '@/lib/mandarin';

export const Route = createFileRoute('/characters')({
  head: () => pageHead('Characters', 'Browse every character, radical and component, then open one to practise writing it stroke by stroke.'),
  component: CharactersPage,
});
