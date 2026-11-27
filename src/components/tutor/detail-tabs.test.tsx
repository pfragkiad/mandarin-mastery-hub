import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { EtymologyView } from '@/lib/etymology';
import { GlyphDetailTabs } from './detail-tabs';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <a {...props}>{children}</a>,
}));
vi.mock('./workspace', () => ({ useWorkspace: () => ({ preferences: { includeTraditional: false } }) }));
const trail = vi.hoisted(() => ({ key: '' as string | undefined, index: undefined as number | undefined }));
vi.mock('@/lib/detail-trail', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/detail-trail')>()),
  historyPosition: () => ({ ...(trail.key ? { key: trail.key } : {}), ...(trail.index !== undefined ? { index: trail.index } : {}) }),
}));
const etymology = vi.hoisted(() => ({ result: null as unknown, calls: 0, byGlyph: null as Record<string, unknown> | null }));
vi.mock('@/lib/etymology', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/etymology')>()),
  resolveEtymology: async (request: { glyph: string }) => { etymology.calls += 1; return etymology.byGlyph ? etymology.byGlyph[request.glyph] ?? null : etymology.result; },
}));

const howellView = {
  glyph: '古', status: 'exact-headword', coverage: 'howell-only', standalone: null, related: [],
  entries: [{ id: 'howell:古', sourceId: 'howell', headword: '古', text: 'ancient', sourceUrl: 'https://example.org' }],
  metadata: { disclaimer: 'Attributed', license_notices: [], import_date: '2026-01-01' },
} as unknown as EtymologyView;
const decomposition = { info: null, body: <p>breakdown body</p> };
const request = { recordId: 'Characters:古', glyph: '古' };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('Glyph detail drawer tabs', () => {
  beforeEach(() => { localStorage.clear(); etymology.result = null; etymology.calls = 0; etymology.byGlyph = null; });

  it('starts collapsed on a first visit, and opening it shows Decomposition', async () => {
    etymology.result = howellView;
    render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    // Nothing is expanded until the learner asks (owner's rule: drawers start collapsed).
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    expect(screen.queryByText('breakdown body')).toBeNull();
    expect(screen.queryByText('ancient')).toBeNull();
    // The Etymology tab is offered because the card's notes resolved in the background,
    // not because the drawer was opened.
    expect(screen.getByRole('tab', { name: 'Etymology' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    expect(screen.getByRole('tab', { name: 'Decomposition', selected: true })).toBeInTheDocument();
    expect(screen.getByText('breakdown body')).toBeInTheDocument();
  });

  it('opens a new card on Decomposition, not the tab chosen on another card', async () => {
    etymology.result = howellView;
    const { rerender } = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Etymology' }));
    expect(screen.getAllByText('ancient').length).toBeGreaterThan(0); // Howell's structured account
    rerender(<GlyphDetailTabs cardKey="Characters:口" decomposition={decomposition} etymology={{ recordId: 'Characters:口', glyph: '口' }}/>);
    await flush();
    // The drawer stays open across the card switch, but the new card has no remembered tab.
    expect(screen.getByRole('tab', { name: 'Decomposition', selected: true })).toBeInTheDocument();
  });

  it('keeps the Etymology tab when the form switch changes the card on the same history entry', async () => {
    etymology.result = howellView;
    trail.index = 7; trail.key = 'entry-1';
    const { rerender } = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    fireEvent.click(screen.getByRole('tab', { name: 'Etymology' }));
    expect(screen.getByRole('tab', { name: 'Etymology', selected: true })).toBeInTheDocument();
    // Form switch: a replace navigation — same history index, fresh key, different record
    // (e.g. 襾 → 西, simplified → traditional).
    trail.key = 'entry-1b';
    rerender(<GlyphDetailTabs cardKey="Characters:口" decomposition={decomposition} etymology={{ recordId: 'Characters:口', glyph: '口' }}/>);
    await flush();
    expect(screen.getByRole('tab', { name: 'Etymology', selected: true })).toBeInTheDocument();
    trail.index = undefined; trail.key = '';
  });

  it('stays collapsed after the learner collapses it, and mounts no drawer body', async () => {
    etymology.result = howellView;
    const first = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    expect(screen.getByText('breakdown body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }));
    first.unmount();
    render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    expect(screen.queryByText('breakdown body')).toBeNull();
    // The notes resolved in the background so the tab could be judged, but nothing is mounted.
    expect(screen.queryByText('ancient')).toBeNull();
  });

  it('collapses when the open tab is clicked again, and reopens on the next click', async () => {
    etymology.result = howellView;
    render(<GlyphDetailTabs cardKey="Characters:toggle" decomposition={decomposition} etymology={request}/>);
    await flush();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    expect(screen.getByText('breakdown body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    expect(screen.queryByText('breakdown body')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Decomposition' }));
    expect(screen.getByText('breakdown body')).toBeInTheDocument();
    // Switching to the other tab keeps the drawer open.
    fireEvent.click(screen.getByRole('tab', { name: 'Etymology' }));
    expect(screen.getAllByText('ancient').length).toBeGreaterThan(0);
  });

  it('hides the Etymology tab once the card turns out to have no notes, while collapsed', async () => {
    render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    // Resolved in the background: the tab is gone before the learner ever opens the drawer.
    expect(screen.queryByRole('tab', { name: 'Etymology' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Decomposition' })).toBeInTheDocument();
  });

  it('renders nothing with no breakdown and no etymology notes', async () => {
    const { container } = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={null} etymology={request}/>);
    await flush();
    expect(container.textContent).toBe('');
  });

  it('word cards list each character with its own notes and say when a character has none', async () => {
    etymology.byGlyph = { 古: howellView };
    render(<GlyphDetailTabs cardKey="word-test-1" decomposition={decomposition} etymology={[{ recordId: 'Characters:古', glyph: '古' }, { recordId: 'Characters:们', glyph: '们' }]}/>);
    await flush();
    fireEvent.click(screen.getByRole('tab', { name: 'Etymology' }));
    expect(screen.getByRole('listitem', { name: 'Etymology of 古' })).toHaveTextContent('ancient');
    expect(screen.getByRole('listitem', { name: 'Etymology of 们' })).toHaveTextContent('No entry for 们 in Howell or Shuowen Jiezi.');
  });

  it('hides the word Etymology tab when none of its characters has notes', async () => {
    etymology.byGlyph = {};
    render(<GlyphDetailTabs cardKey="word-test-2" decomposition={decomposition} etymology={[{ recordId: 'Characters:们', glyph: '们' }, { recordId: 'Characters:脑', glyph: '脑' }]}/>);
    await flush();
    expect(screen.queryByRole('tab', { name: 'Etymology' })).not.toBeInTheDocument();
  });
});
