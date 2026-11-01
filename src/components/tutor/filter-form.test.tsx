import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftFilterForm } from './filter-form';

describe('Explicit filter edits', () => {
  it('submits only changed drafts and restores the applied input after an edit is undone', async () => {
    const apply = vi.fn();
    render(<DraftFilterForm applied={{ q: '' }} active={false} count={103} onApply={apply} onClear={() => ({ q: '' })}>{({ draft, patch }) => <input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'comp' } });
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ q: 'comp' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it('clears an active filter immediately and resets the draft', async () => {
    const clear = vi.fn(() => ({ q: '' }));
    const view = render(<DraftFilterForm applied={{ q: 'comp' }} active count={103} onApply={vi.fn()} onClear={clear}>{({ draft, patch }) => <input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(screen.getByRole('textbox')).toHaveValue('');
    view.rerender(<DraftFilterForm applied={{ q: '' }} active={false} count={103} onApply={vi.fn()} onClear={clear}>{({ draft }) => <input aria-label="Query" value={draft.q} readOnly/>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it('does not rerender the results owner when typing', () => {
    const ownerRender = vi.fn();
    function Owner() {
      ownerRender();
      return <DraftFilterForm applied={{ q: '' }} active={false} count={103} onApply={vi.fn()} onClear={() => ({ q: '' })}>{({ draft, patch }) => <input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/>}</DraftFilterForm>;
    }
    render(<Owner/>);
    ownerRender.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'c' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'co' } });
    expect(ownerRender).not.toHaveBeenCalled();
  });
});