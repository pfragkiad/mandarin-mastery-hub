import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { RadicalForms } from './radical-forms';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, ...props }: { to: string; search: Record<string, unknown>; children: React.ReactNode; 'aria-label'?: string }) =>
    <a href={to} aria-label={props['aria-label']} onClick={event => { event.preventDefault(); navigate({ to, search }); }}>{children}</a>,
}));
afterEach(() => { cleanup(); navigate.mockClear(); });

describe('Radical form destinations', () => {
  it('switches the exact water variant inside Practice with its family-qualified selection', () => {
    render(<RadicalForms familyId={85} destination="practice"/>);
    fireEvent.click(screen.getByRole('link', { name: 'Practice radical form 氵, 3 strokes' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/strokes', search: { character: '氵', family: 85, variant: '85-1' } });
  });
  it('keeps reference form selections in Glyphs', () => {
    render(<RadicalForms familyId={85}/>);
    fireEvent.click(screen.getByRole('link', { name: 'View radical form 氵, 3 strokes' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/characters', search: { tab: 'Radicals', id: 'Radicals:水', variant: '85-1' } });
  });
});