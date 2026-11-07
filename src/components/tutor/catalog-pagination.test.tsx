import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPagination } from './catalog-pagination';

const base = { range: '81–100', total: 7427, current: 5, pages: 372, perPage: 20 as const };

describe('Library paging and explicit jumps', () => {
  beforeEach(() => localStorage.clear());
  it('direct jumps navigate all six pages with only previous/next arrows', () => {
    const change = vi.fn();
    render(<CatalogPagination {...base} pages={6} onPageChange={change}/>);
    for (let page = 1; page <= 6; page++) fireEvent.click(screen.getByRole('button', { name: `Go to page ${page}` }));
    expect(change.mock.calls).toEqual([[1], [2], [3], [4], [5], [6]]);
    expect(screen.queryByRole('button', { name: 'First page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Last page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to' })).toBeNull();
  });

  it('seven pages use compact navigation instead of direct jumps', () => {
    render(<CatalogPagination {...base} pages={7} onPageChange={vi.fn()}/>);
    expect(screen.queryByRole('button', { name: 'Go to page 7' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('one page has no paging controls', () => {
    render(<CatalogPagination {...base} pages={1} current={1} onPageChange={vi.fn()}/>);
    expect(screen.queryByRole('button', { name: 'Previous page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to' })).toBeNull();
  });

  it('an absent rank jumps immediately and closes the form', () => {
    const rank = vi.fn(() => 512);
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={rank} ranks={{ count: 1416, min: 1, max: 1436 }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: /^Rank$/ }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '511' } });
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    expect(rank).toHaveBeenCalledExactlyOnceWith(511);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps nearest feedback on the jump destination but clears it on the next page change', () => {
    const props = { ...base, onPageChange: vi.fn(), onRankChange: vi.fn(() => ({ rank: 512, page: 6 })), ranks: { count: 399, min: 252, max: 9206 } };
    const { rerender } = render(<CatalogPagination {...props}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '511' } });
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    rerender(<CatalogPagination {...props} current={6}/>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<CatalogPagination {...props} current={7}/>);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<CatalogPagination {...props} current={6}/>);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('prefills the current page when opening and returning to Page mode', () => {
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={vi.fn()} ranks={{ count: 78, min: 3, max: 5420 }} currentRank={123}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: /^Page$/ }));
    expect(screen.getByRole('spinbutton', { name: 'Jump to page' })).toHaveValue(5);
    fireEvent.click(screen.getByRole('button', { name: /^Rank$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Page$/ }));
    expect(screen.getByRole('spinbutton', { name: 'Jump to page' })).toHaveValue(5);
  });

  it('prefills the first visible recorded rank rather than a filtered position', () => {
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={vi.fn()} ranks={{ count: 78, min: 3, max: 5420 }} currentRank={123}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: /^Rank$/ }));
    expect(screen.getByRole('spinbutton', { name: 'Jump to rank' })).toHaveValue(123);
  });
  it('defaults to Rank and remembers Page across reopening', () => {
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={vi.fn()} ranks={{ count: 399, min: 252, max: 9206 }} currentRank={512}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    expect(screen.getByRole('spinbutton', { name: 'Jump to rank' })).toHaveValue(512);
    fireEvent.click(screen.getByRole('button', { name: /^Page$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    expect(screen.getByRole('spinbutton', { name: 'Jump to page' })).toHaveValue(5);
  });
  it('selects the current value on focus so typing replaces it', () => {
    render(<CatalogPagination {...base} onPageChange={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    const input = screen.getByRole('spinbutton');
    const select = vi.spyOn(input as HTMLInputElement, 'select');
    fireEvent.focus(input);
    expect(select).toHaveBeenCalledOnce();
  });
  it.each([[0, 252], [99999, 9206]])('clamps rank %s to the filtered boundary %s', (requested, boundary) => {
    const rank = vi.fn(() => boundary);
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={rank} ranks={{ count: 399, min: 252, max: 9206 }} currentRank={512}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: String(requested) } });
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    expect(rank).toHaveBeenCalledExactlyOnceWith(boundary);
  });
  it('jumps to unranked without sending an invented rank', () => {
    const unranked = vi.fn();
    const rank = vi.fn();
    render(<CatalogPagination {...base} total={436} onPageChange={vi.fn()} onRankChange={rank} onUnrankedChange={unranked} ranks={{ count: 399, min: 252, max: 9206 }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jump to unranked' }));
    expect(unranked).toHaveBeenCalledOnce();
    expect(rank).not.toHaveBeenCalled();
  });
  it('has no unranked jump when all 399 records are ranked', () => {
    render(<CatalogPagination {...base} total={399} onPageChange={vi.fn()} onRankChange={vi.fn()} onUnrankedChange={vi.fn()} ranks={{ count: 399, min: 252, max: 9206 }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    expect(screen.queryByRole('button', { name: 'Jump to unranked' })).toBeNull();
  });
  it('first/previous/next/last navigate to the exact page boundaries', () => {
    const change = vi.fn();
    render(<CatalogPagination {...base} onPageChange={change}/>);
    for (const label of ['First page', 'Previous page', 'Next page', 'Last page']) fireEvent.click(screen.getByRole('button', { name: label }));
    expect(change.mock.calls).toEqual([[1], [4], [6], [372]]);
  });

  it('only submitting Go commits a page draft, not blur or switching modes', () => {
    const change = vi.fn();
    render(<CatalogPagination {...base} onPageChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    const input = screen.getByRole('spinbutton', { name: 'Jump to page' });
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    expect(change).toHaveBeenCalledExactlyOnceWith(20);
  });

  it('rejects pages outside the currently filtered total', () => {
    const change = vi.fn();
    render(<CatalogPagination {...base} pages={8} current={1} total={78} onPageChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '9' } });
    fireEvent.submit(screen.getByRole('spinbutton').closest('form') as HTMLFormElement);
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    expect(change).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('passes original recorded rank numbers, not filtered result positions', () => {
    const rank = vi.fn();
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={rank} ranks={{ count: 78, min: 3, max: 5420 }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: /^Rank$/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Jump to rank' }), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Go$/ }));
    expect(rank).toHaveBeenCalledExactlyOnceWith(5000);
  });

  it('top and bottom rows both apply the selected 10/20/50 per-page value', () => {
    const change = vi.fn();
    render(<><CatalogPagination {...base} top onPageChange={vi.fn()} onPerPageChange={change}/><CatalogPagination {...base} onPageChange={vi.fn()} onPerPageChange={change}/></>);
    const top = screen.getAllByRole('button', { name: '50 per page' })[0];
    const bottom = screen.getAllByRole('button', { name: '10 per page' })[1];
    if (!top || !bottom) throw new Error('Both paging rows must be available');
    fireEvent.click(top);
    fireEvent.click(bottom);
    expect(change.mock.calls).toEqual([[50], [10]]);
  });
});