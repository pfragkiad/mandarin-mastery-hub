import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { RadicalForms } from './radical-forms';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, ...props }: { to: string; search: Record<string, unknown>; children: React.ReactNode; 'aria-label'?: string }) =>
    <a href={to} aria-label={props['aria-label']} onClick={event => { event.preventDefault(); navigate({ to, search }); }}>{children}</a>,
  useNavigate: () => navigate,
}));
afterEach(() => { cleanup(); navigate.mockClear(); });

describe('Radical form destinations', () => {
  it('keeps Trace when selecting an exact radical variant', () => {
    render(<RadicalForms familyId={85} destination="practice" mode="trace"/>);
    fireEvent.click(screen.getByRole('link', { name: 'Practice radical form 氵, 3 strokes' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/strokes', search: { character: '氵', family: 85, variant: '85-1', mode: 'trace' } });
  });
  it('switches the exact water variant inside Practice with its family-qualified selection', () => {
    render(<RadicalForms familyId={85} destination="practice"/>);
    fireEvent.click(screen.getByRole('link', { name: 'Practice radical form 氵, 3 strokes' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/strokes', search: { character: '氵', family: 85, variant: '85-1' } });
  });
  it('compact dropdown switches the exact variant and keeps the writing mode', () => {
    render(<RadicalForms compact familyId={85} destination="practice" mode="trace" selectedKey="85-0"/>);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('85-0');
    fireEvent.change(select, { target: { value: '85-1' } });
    expect(navigate).toHaveBeenCalledWith({ to: '/strokes', search: { character: '氵', family: 85, variant: '85-1', mode: 'trace' } });
  });
  it('keeps reference form selections in Glyphs', () => {
    render(<RadicalForms familyId={85}/>);
    fireEvent.click(screen.getByRole('link', { name: 'View radical form 氵, 3 strokes' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/characters', search: { tab: 'Radicals', id: 'Radicals:水', variant: '85-1' } });
  });
});