import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RecordCardFooter } from './record-card-footer';

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children, ...rest }: { to: string; search: Record<string, unknown>; children: React.ReactNode }) => <a {...rest} href={`${to}?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}`}>{children}</a> }));
afterEach(cleanup);

it('the card practice brush opens Practice in Trace', () => {
  render(<RecordCardFooter metadata="" hanzi="好" bookmarked={false} onBookmark={vi.fn()}/>);
  expect(screen.getByRole('link', { name: 'Trace 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=trace');
});
it('the Expert action still opens Practice in Recall', () => {
  render(<RecordCardFooter metadata="" hanzi="好" bookmarked={false} onBookmark={vi.fn()}/>);
  expect(screen.getByRole('link', { name: 'Recall 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=recall');
});
it('Comfortable cards show labelled Details, Trace and Recall, with Save moved to the card face', () => {
  const open = vi.fn();
  render(<RecordCardFooter metadata="" hanzi="好" bookmarked={false} onBookmark={vi.fn()} comfortable onOpen={open}/>);
  expect(screen.getByRole('link', { name: 'Trace 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=trace');
  expect(screen.getByRole('link', { name: 'Recall 好' }).getAttribute('href')).toBe('/strokes?character=%E5%A5%BD&mode=recall');
  screen.getByRole('button', { name: 'Open details for 好' }).click();
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Bookmark 好' })).toBeNull();
});
