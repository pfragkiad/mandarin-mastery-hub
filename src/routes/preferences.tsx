import { createFileRoute } from '@tanstack/react-router';
import { PreferencesPage } from '@/components/tutor/preferences';
import { pageHead } from '@/lib/mandarin';

export const Route = createFileRoute('/preferences')({ head: () => pageHead('Preferences', 'Personalize your Mandarin reading, writing and listening preferences.'), component: PreferencesPage });
