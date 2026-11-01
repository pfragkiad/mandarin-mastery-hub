import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DetailLoading, useDetailLoading } from './detail-loading';

it('selects the exact card before navigation and removes waiting feedback after completion', async () => {
  let finish: (() => void) | undefined;
  const navigate = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  function Example() {
    const loading = useDetailLoading();
    return <div className="library-page"><article className="word-card is-selected" data-entry-id="old"/><article className="word-card" data-entry-id="new"/><button onClick={() => { void loading.run('new', navigate); }}>Select</button><DetailLoading loading={loading}><p>Details</p></DetailLoading></div>;
  }
  render(<Example/>);
  fireEvent.click(screen.getByRole('button', { name: 'Select' }));
  expect(document.querySelector('.word-card.is-selected')).toHaveAttribute('data-entry-id', 'new');
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
  await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
  await act(async () => { finish?.(); });
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect([...document.head.querySelectorAll('style')].some(style => style.textContent?.includes('cursor: wait'))).toBe(false);
});