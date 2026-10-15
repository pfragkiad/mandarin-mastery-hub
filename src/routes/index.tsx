import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/components/tutor/overview';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/')({ head: () => pageHead('Your Mandarin journey', 'A calmer way to learn Mandarin. Explore vocabulary, discover characters, and practice writing one stroke at a time.'), component: OverviewPage });
