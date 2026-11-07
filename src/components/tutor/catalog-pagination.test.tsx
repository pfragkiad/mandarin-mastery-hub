import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogPagination } from './catalog-pagination';

const base = { range: '81–100', total: 7427, current: 5, pages: 372, perPage: 20 as const };

describe('Library paging and explicit jumps', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Go', exact: true }));
    expect(change).toHaveBeenCalledExactlyOnceWith(20);
  });

  it('rejects pages outside the currently filtered total', () => {
    const change = vi.fn();
    render(<CatalogPagination {...base} pages={4} current={1} total={78} onPageChange={change}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.submit(screen.getByRole('spinbutton').closest('form') as HTMLFormElement);
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go', exact: true }));
    expect(change).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('passes original recorded rank numbers, not filtered result positions', () => {
    const rank = vi.fn();
    render(<CatalogPagination {...base} onPageChange={vi.fn()} onRankChange={rank} ranks={{ count: 78, min: 3, max: 5420 }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Go to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rank', exact: true }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Jump to rank' }), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go', exact: true }));
    expect(rank).toHaveBeenCalledExactlyOnceWith(5000);
  });

  it('top and bottom rows both apply the selected 10/20/50 per-page value', () => {
    const change = vi.fn();
    render(<><CatalogPagination {...base} top onPageChange={vi.fn()} onPerPageChange={change}/><CatalogPagination {...base} onPageChange={vi.fn()} onPerPageChange={change}/></>);
    fireEvent.click(screen.getAllByRole('button', { name: '50 per page' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '10 per page' })[1]);
    expect(change.mock.calls).toEqual([[50], [10]]);
  });
});