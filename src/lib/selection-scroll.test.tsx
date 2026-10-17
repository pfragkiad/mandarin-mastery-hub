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
    scrollIntoView.mockClear();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 1000, bottom: 1224, left: 0, right: 200, width: 200, height: 224, x: 0, y: 1000, toJSON: () => ({}) });
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('scrolls the selected card into view when the selection changes', async () => {
    const { rerender } = render(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    rerender(<Harness id="Characters:水" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
    expect(scrolled.at(-1)).toHaveAttribute('data-entry-id', 'Characters:水');
  });

  it('reveals an offscreen card even when the same record is selected again', async () => {
    const { rerender } = render(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    rerender(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
  });

  it('does not move a fully visible card on selections or restored history', async () => {
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValue({ top: 100, bottom: 324, left: 0, right: 200, width: 200, height: 224, x: 0, y: 100, toJSON: () => ({}) });
    const { rerender } = render(<Harness id="Characters:喝" />);
    await new Promise(resolve => setTimeout(resolve, 60));
    rerender(<Harness id="Characters:水" />);
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('reveals the previous selected card when history returns to it', async () => {
    const { rerender } = render(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    rerender(<Harness id="Characters:水" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
    rerender(<Harness id="Characters:喝" />);
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(3));
    expect(scrolled.at(-1)).toHaveAttribute('data-entry-id', 'Characters:喝');
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
