import { createFileRoute } from '@tanstack/react-router';
import { ReferencesPage } from '@/components/tutor/references';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/references')({ head: () => pageHead('Character references', 'Explore Chinese radicals, components, and characters with readings, meanings, and writing practice.'), component: ReferencesPage });
