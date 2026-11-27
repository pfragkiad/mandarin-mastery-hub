import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DraftFilterForm } from './filter-form';

afterEach(() => vi.unstubAllGlobals());

describe('Phone filter sheet', () => {
  it('drafts sheet filters until Apply and removes only the selected applied chip', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const apply = vi.fn();
    render(<DraftFilterForm applied={{ q: 'qi', strokes: '10' }} active count={881} resetLabel="Reset" onApply={apply} onClear={() => ({ q: '', strokes: '' })} chips={[{ label: '10 strokes', clear: { strokes: '' } }]} filterFields={({ draft, patch }) => <select aria-label="Strokes" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}><option value="10">10</option><option value="5">5</option></select>}>{({ draft }) => <input aria-label="Query" value={draft.q} readOnly/>}</DraftFilterForm>);
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Strokes'), { target: { value: '5' } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset' }).at(-1) as HTMLElement);
    expect(screen.getByLabelText('Strokes')).toHaveValue('10');
    expect(apply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Strokes'), { target: { value: '5' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Apply' }).at(-1) as HTMLElement);
    await waitFor(() => expect(apply).toHaveBeenLastCalledWith({ q: 'qi', strokes: '5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove 10 strokes filter' }));
    await waitFor(() => expect(apply).toHaveBeenLastCalledWith({ q: 'qi', strokes: '' }));
  });
});

describe('Phone search-box clear', () => {
  const phone = () => vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const fields = ({ draft, patch }: { draft: { strokes: string }; patch: (next: { strokes: string }) => void }) => <select aria-label="Strokes" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}><option value="">All</option><option value="10">10</option></select>;

  it('clears only the applied search text and keeps the other filters', async () => {
    phone();
    const apply = vi.fn();
    render(<DraftFilterForm searchKey="q" applied={{ q: 'wo', strokes: '10', py: 'pinyin' }} active count={268} onApply={apply} onClear={() => ({ q: '', strokes: '', py: '' })} filterFields={fields}>{({ draft, patch }) => <div className="search-field"><input aria-label="Query" value={draft.q} onChange={e => patch({ q: e.target.value })}/></div>}</DraftFilterForm>);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ q: '', strokes: '10', py: 'pinyin' }));
    expect(screen.getByLabelText('Query')).toHaveValue('');
  });

  it('empties unapplied typing without applying anything, and hides when there is no text', () => {
    phone();
    const apply = vi.fn();
    render(<DraftFilterForm searchKey="q" applied={{ q: '', strokes: '' }} active={false} count={407} onApply={apply} onClear={() => ({ q: '', strokes: '' })} filterFields={fields}>{({ draft, patch }) => <div className="search-field"><input aria-label="Query" value={draft.q} onChange={e => patch({ q: e.target.value })}/></div>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'zh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Query')).toHaveValue('');
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});

describe('Search mode toggle', () => {
  it('offers Apply for the Pinyin toggle only once there is search text', async () => {
    const apply = vi.fn();
    render(<DraftFilterForm searchKey="q" searchModeKey="py" applied={{ q: '', py: undefined as string | undefined }} active={false} count={103} onApply={apply} onClear={() => ({ q: '', py: undefined })}>{({ draft, patch }) => <><input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/><button type="button" onClick={() => patch({ py: draft.py ? undefined : 'pinyin' })}>Pinyin</button></>}</DraftFilterForm>);
    fireEvent.click(screen.getByRole('button', { name: 'Pinyin' }));
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'ma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ q: 'ma', py: 'pinyin' }));
  });
});

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
describe('Auto-applied filter edits (games)', () => {
  it('submits each draft edit immediately and never shows the Apply button', async () => {
    const apply = vi.fn();
    render(<DraftFilterForm applied={{ q: '' }} active={false} count={103} autoApply onApply={apply} onClear={() => ({ q: '' })}>{({ draft, patch }) => <input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/>}</DraftFilterForm>);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'comp' } });
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ q: 'comp' }));
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(2));
    expect(apply).toHaveBeenLastCalledWith({ q: '' });
  });
  it('shows Clear only while a filter is active', async () => {
    render(<DraftFilterForm applied={{ q: '' }} active={false} count={103} autoApply onApply={vi.fn()} onClear={() => ({ q: '' })}>{({ draft, patch }) => <input aria-label="Query" value={draft.q} onChange={event => patch({ q: event.target.value })}/>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });
});


describe('Explicit game filters', () => {
  it('collects all edits into one Apply submission', async () => {
    const apply = vi.fn();
    render(<DraftFilterForm applied={{ strokes: '', course: '' }} active={false} count={12} resetLabel="Reset" onApply={apply} onClear={() => ({ strokes: '', course: '' })}>{({ draft, patch }) => <><input aria-label="Range" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}/><input aria-label="Course" value={draft.course} onChange={e => patch({ course: e.target.value })}/></>}</DraftFilterForm>);
    fireEvent.change(screen.getByLabelText('Range'), { target: { value: '1-14' } });
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'conversational-mandarin' } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ strokes: '1-14', course: 'conversational-mandarin' }));
  });
  it('Reset discards unapplied changes without altering the applied filter', () => {
    const apply = vi.fn();
    const clear = vi.fn(() => ({ strokes: '' }));
    render(<DraftFilterForm applied={{ strokes: '1-5' }} active count={12} resetLabel="Reset" onApply={apply} onClear={clear}>{({ draft, patch }) => <input aria-label="Range" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}/>}</DraftFilterForm>);
    fireEvent.change(screen.getByLabelText('Range'), { target: { value: '6-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(clear).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Range')).toHaveValue('1-5');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
  it('Reset restores an unfiltered draft without applying or clearing anything', () => {
    const apply = vi.fn();
    const clear = vi.fn(() => ({ strokes: '' }));
    render(<DraftFilterForm applied={{ strokes: '' }} active={false} count={12} resetLabel="Reset" onApply={apply} onClear={clear}>{({ draft, patch }) => <input aria-label="Range" value={draft.strokes} onChange={e => patch({ strokes: e.target.value })}/>}</DraftFilterForm>);
    fireEvent.change(screen.getByLabelText('Range'), { target: { value: '6-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(clear).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Range')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });
});


describe('Game Apply and Reset lifecycle', () => {
  it('hides Apply and Reset after submission while Clear filters remains', async () => {
    const apply = vi.fn();
    const clear = vi.fn(() => ({ level: '' }));
    const view = render(<DraftFilterForm applied={{ level: '' }} active={false} count={3596} resetLabel="Reset" onApply={apply} onClear={clear}>{({ draft, patch }) => <input aria-label="Level" value={draft.level} onChange={e => patch({ level: e.target.value })}/>}</DraftFilterForm>);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'HSK 3.0 · 2,HSK 3.0 · 3' } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith({ level: 'HSK 3.0 · 2,HSK 3.0 · 3' }));
    view.rerender(<DraftFilterForm applied={{ level: 'HSK 3.0 · 2,HSK 3.0 · 3' }} active count={100} resetLabel="Reset" onApply={apply} onClear={clear}>{({ draft }) => <input aria-label="Level" value={draft.level} readOnly/>}</DraftFilterForm>);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Level')).toHaveValue('');
  });
});
