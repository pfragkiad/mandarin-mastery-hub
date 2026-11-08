import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RecordCardFooter } from './record-card-footer';

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...rest }: { to: string; search: Record<string, unknown>; children: React.ReactNode }) => <a {...rest} href={`${to}?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}`}>{children}</a> }));
afterEach(cleanup);

it('the card practice brush opens Practice in Trace', () => {
  render(<RecordCardFooter metadata="" hanzi="好" bookmarked={false} onBookmark={vi.fn()}/>);
  expect(screen.getByRole('link', { name: 'Practice writing 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=trace');
});
it('the Expert action still opens Practice in Recall', () => {
  render(<RecordCardFooter metadata="" hanzi="好" bookmarked={false} onBookmark={vi.fn()}/>);
  expect(screen.getByRole('link', { name: 'Practice Expert (Recall) 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=recall');
});
