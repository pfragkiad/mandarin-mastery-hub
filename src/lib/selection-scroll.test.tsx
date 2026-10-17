import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordScroll } from './selection-scroll';

function Harness({ id, ready = true }: { id: string; ready?: boolean }) {
  useRecordScroll(id, ready);
  return <div>
    <div data-entry-id="Characters:喝" />
    <div data-entry-id="Characters:水" />
  </div>;
}

describe('useRecordScroll', () => {
  let scrolled: HTMLElement[] = [];
  const scrollIntoView = vi.fn(function (this: HTMLElement) { scrolled.push(this); });

  beforeEach(() => {
    scrolled = [];
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  });
  afterEach(() => {
    cleanup();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('scrolls the selected card into view when the selection changes', async () => {
    const { rerender } = render(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    rerender(<Harness id="Characters:水" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
    expect(scrolled.at(-1)).toHaveAttribute('data-entry-id', 'Characters:水');
  });

  it('does not scroll when the selection is unchanged (same-page clicks keep scroll position)', async () => {
    const { rerender } = render(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    rerender(<Harness id="Characters:喝" />);
    rerender(<Harness id="Characters:喝" />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an empty selection', () => {
    render(<Harness id="" />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('waits until the records are ready before scrolling', async () => {
    const { rerender } = render(<Harness id="Characters:喝" ready={false} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<Harness id="Characters:喝" ready />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
  });
});
