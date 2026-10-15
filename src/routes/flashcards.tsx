import { createFileRoute } from '@tanstack/react-router';
import { FlashcardsPage } from '@/components/tutor/flashcards';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/flashcards')({ head: () => pageHead('Flashcards', 'Practise Mandarin vocabulary and characters with shuffled flashcards by category and level.'), component: FlashcardsPage });
