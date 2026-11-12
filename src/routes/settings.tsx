import { createFileRoute, redirect } from '@tanstack/react-router';
// The page is called Preferences now; keep the old address working for bookmarks and history.
export const Route = createFileRoute('/settings')({
  beforeLoad: () => { throw redirect({ to: '/preferences', replace: true }); },
});
