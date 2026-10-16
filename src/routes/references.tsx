import { createFileRoute, redirect } from '@tanstack/react-router';
// The old References page duplicated the Characters catalogue; keep its address working.
export const Route = createFileRoute('/references')({
  beforeLoad: () => { throw redirect({ to: '/characters', replace: true }); },
});
