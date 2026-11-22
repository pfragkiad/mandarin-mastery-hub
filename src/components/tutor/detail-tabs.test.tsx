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
const etymology = vi.hoisted(() => ({ result: null as unknown, calls: 0 }));
vi.mock('@/lib/etymology', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/etymology')>()),
  resolveEtymology: async () => { etymology.calls += 1; return etymology.result; },
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
  beforeEach(() => { localStorage.clear(); etymology.result = null; etymology.calls = 0; });

  it('opens on Decomposition, even after Etymology was chosen on another card', async () => {
    etymology.result = howellView;
    const { rerender } = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    expect(screen.getByRole('tab', { name: 'Decomposition', selected: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Etymology' }));
    expect(screen.getAllByText('ancient').length).toBeGreaterThan(0); // Howell's structured account
    rerender(<GlyphDetailTabs cardKey="Characters:口" decomposition={decomposition} etymology={{ recordId: 'Characters:口', glyph: '口' }}/>);
    await flush();
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

  it('remembers a collapsed drawer and loads nothing while collapsed', async () => {
    etymology.result = howellView;
    const first = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }));
    first.unmount();
    etymology.calls = 0;
    render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    expect(screen.queryByText('breakdown body')).toBeNull();
    expect(etymology.calls).toBe(0);
  });

  it('collapses when the open tab is clicked again, and reopens on the next click', async () => {
    etymology.result = howellView;
    render(<GlyphDetailTabs cardKey="Characters:toggle" decomposition={decomposition} etymology={request}/>);
    await flush();
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

  it('hides the Etymology tab once the card turns out to have no notes', async () => {
    render(<GlyphDetailTabs cardKey="Characters:古" decomposition={decomposition} etymology={request}/>);
    await flush();
    expect(screen.queryByRole('tab', { name: 'Etymology' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Decomposition' })).toBeInTheDocument();
  });

  it('renders nothing with no breakdown and no etymology notes', async () => {
    const { container } = render(<GlyphDetailTabs cardKey="Characters:古" decomposition={null} etymology={request}/>);
    await flush();
    expect(container.textContent).toBe('');
  });
});
