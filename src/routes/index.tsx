import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/components/tutor/overview';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/')({ head: () => pageHead('Overview', 'Explore imported HSK words, practice phrases and the Mandarin character library. Discover a new word, study its details and build your recall.'), component: OverviewPage });
