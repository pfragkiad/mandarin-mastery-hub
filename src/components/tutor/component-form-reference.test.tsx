import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ComponentFormReference } from './component-form-reference';

const listen = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, search, resetScroll: _reset, to, ...props }: { children: ReactNode; search: { tab: string; id: string }; resetScroll?: boolean; to: string }) =>
    <a {...props} href={`${to}?${new URLSearchParams(search)}`}>{children}</a>,
}));
vi.mock('./example-pronunciation', () => ({
  ExamplePronunciation: ({ request, label }: { request: { text: string; reading: string }; label: string }) =>
    <button onClick={() => listen(request)} aria-label={`Listen to ${label}`}>Listen</button>,
}));
afterEach(() => { cleanup(); listen.mockClear(); });

describe('independent related-record pronunciation', () => {
  it('opens the exact 卷 record and speaks its own juǎn reading', () => {
    render(<ComponentFormReference glyph="龹"/>);
    const link = screen.getByRole('link', { name: 'Open character 卷' });
    expect(link).toHaveAttribute('href', '/characters?tab=Characters&id=Characters%3A%E5%8D%B7');
    const speaker = screen.getByRole('button', { name: 'Listen to 卷 (juǎn)' });
    expect(link.contains(speaker)).toBe(false);
    fireEvent.click(speaker);
    expect(listen).toHaveBeenCalledWith(expect.objectContaining({ text: '卷', reading: 'juǎn' }));
    expect(screen.queryByText('quǎn')).toBeNull();
  });

  it('keeps variant meaning attribution distinct from the phonetic-related label', () => {
    const { rerender } = render(<ComponentFormReference glyph="歨"/>);
    expect(screen.getByText('Meaning from')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open character 步' })).toBeInTheDocument();
    rerender(<ComponentFormReference glyph="龹"/>);
    expect(screen.getByText('Related character')).toBeInTheDocument();
  });

  it('renders no reference for an unreviewed glyph', () => {
    const { container } = render(<ComponentFormReference glyph="好"/>);
    expect(container).toBeEmptyDOMElement();
  });
});
