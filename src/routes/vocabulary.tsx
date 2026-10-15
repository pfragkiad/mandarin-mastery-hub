import { createFileRoute } from '@tanstack/react-router';
import { VocabularyPage } from '@/components/tutor/vocabulary';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/vocabulary')({ head: () => pageHead('Vocabulary', 'Discover Mandarin words, listen to pronunciation, and collect vocabulary for everyday life.'), component: VocabularyPage });
