import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/tutor/settings';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/settings')({ head: () => pageHead('Learning preferences', 'Personalize your Mandarin reading and listening preferences.'), component: SettingsPage });
