import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailSheet, detailSheetWidth } from './detail-sheet';
import { detailTrail, recordVisit } from '@/lib/detail-trail';
import type { ReactNode } from 'react';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('detail window width', () => {
  it('allows wider windows within the available screen', () => {
    expect(detailSheetWidth(1200, 1600)).toBe(1200);
    expect(detailSheetWidth(2000, 1600)).toBe(1568);
  });
  it('keeps a usable minimum without overflowing a narrow screen', () => {
    expect(detailSheetWidth(100, 1600)).toBe(360);
    expect(detailSheetWidth(1200, 390)).toBe(358);
  });
});

function setup() {
  const onClose = vi.fn();
  render(<DetailSheet open title="Character details" onClose={onClose}><p>Record</p></DetailSheet>);
  return { onClose, close: screen.getByRole('button', { name: 'Close and show card in list' }) };
}

describe('Modal detail sheet', () => {
  it('keeps navigation available while changing records and closes only explicitly', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<><button>Background card</button><DetailSheet open title="First record" position={0} total={2} onClose={onClose} onNext={onNext}><p>First</p></DetailSheet></>);
    expect(screen.getByRole('button', { name: 'Previous card in this list' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next card in this list' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(<><button>Background card</button><DetailSheet open title="Second record" position={1} total={2} onClose={onClose} onPrevious={onPrevious}><p>Second</p></DetailSheet></>);
    fireEvent.click(screen.getByRole('button', { name: 'Previous card in this list' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Next card in this list' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Background card' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Close and show card in list$/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when activated', () => {
    const { close, onClose } = setup();
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to the previous record with ArrowLeft and the next with ArrowRight', () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<DetailSheet open title="Record details" onClose={vi.fn()} onPrevious={onPrevious} onNext={onNext}><p>Record</p></DetailSheet>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close and show card in list' }), { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('respects navigation boundaries and does not intercept editing or modified arrow keys', () => {
    const onNext = vi.fn();
    render(<DetailSheet open title="Record details" onClose={vi.fn()} onNext={onNext}><input aria-label="Notes"/></DetailSheet>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight', altKey: true });
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('offers Back to the practice page it was opened from, and clears it on neighbour steps', () => {
    // Practice records its own location in the trail before navigating here.
    detailTrail.replace({ label: 'Practice (好)', href: '/strokes?character=好&mode=watch' });
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      render(<DetailSheet open title="Character details" label="女" position={2} total={10} onClose={vi.fn()} onNext={vi.fn()}><p>Record</p></DetailSheet>);
      fireEvent.click(screen.getByRole('button', { name: 'Back to Practice (好)' }));
      expect(backSpy).toHaveBeenCalledTimes(1);
      // Stepping to a neighbour card is list navigation, not history: it resets Back.
      fireEvent.click(screen.getByRole('button', { name: 'Next card in this list' }));
      expect(screen.queryByRole('button', { name: /^Back to / })).not.toBeInTheDocument();
    } finally {
      detailTrail.clear();
      backSpy.mockRestore();
    }
  });
  it('keeps Back when links return to a form already seen (亻 → 人 → 亻 are new history entries)', () => {
    const go = (search: string, key: string) => window.history.pushState({ __TSR_key: key }, '', search);
    const sheet = (title: string, label: string, to: string) => <DetailSheet open title={title} label={label} onClose={vi.fn()}><a href={to} onClick={event => event.preventDefault()}>switch</a></DetailSheet>;
    go('?variant=9-1', 'k1');
    try {
      const view = render(sheet('人 9-1', '亻', '?variant=9-0'));
      fireEvent.click(screen.getByText('switch'));
      go('?variant=9-0', 'k2');
      view.rerender(sheet('人 9-0', '人', '?variant=9-1'));
      fireEvent.click(screen.getByText('switch'));
      go('?variant=9-1', 'k3');
      view.rerender(sheet('人 9-1', '亻', '?variant=9-0'));
      expect(screen.getByRole('button', { name: 'Back to 人' })).toBeInTheDocument();
    } finally {
      detailTrail.clear();
    }
  });
});
describe('Detail sheet scroll on form switches', () => {
  // A form switch (师 → 師) is the same card, so the reader keeps their place;
  // any other link to a different card starts it at the top.
  const sheet = (title: string, switchLink: boolean) => <DetailSheet open title={title} onClose={vi.fn()}>
    {switchLink ? <div className="form-switch"><a href="?id=2" onClick={event => event.preventDefault()}>Traditional</a></div> : <a href="?id=3" onClick={event => event.preventDefault()}>Other card</a>}
  </DetailSheet>;
  // jsdom has no element scrolling: give the panel a scrollTo that moves scrollTop.
  const panel = () => {
    const el = document.querySelector<HTMLElement>('.detail-sheet-body')!;
    el.scrollTo = function (this: HTMLElement, options?: ScrollToOptions | number) { this.scrollTop = typeof options === 'object' ? options.top ?? 0 : 0; } as typeof Element.prototype.scrollTo;
    return el;
  };
  it('keeps the scroll position when switching forms on the same card', () => {
    const view = render(sheet('Details for 师', true));
    panel().scrollTop = 240;
    fireEvent.click(screen.getByText('Traditional'));
    view.rerender(sheet('Details for 師', true));
    expect(panel().scrollTop).toBe(240);
    detailTrail.clear();
  });
  it('starts another card at the top', () => {
    const view = render(sheet('Details for 师', false));
    panel().scrollTop = 240;
    fireEvent.click(screen.getByText('Other card'));
    view.rerender(sheet('Details for 老', false));
    expect(panel().scrollTop).toBe(0);
    detailTrail.clear();
  });
});
describe('Close returns where the window was opened from', () => {
  // Simulates the router: each entry carries its index/key, and the root records the page.
  const visit = (path: string, index: number) => { window.history.pushState({ __TSR_index: index, __TSR_key: `k${index}` }, '', path); recordVisit(); };
  const sheet = (onClose: () => void, title = 'Details for 襾', children: ReactNode = <p>Record</p>) =>
    <DetailSheet open title={title} label="襾" position={3} total={10} onClose={onClose} onNext={vi.fn()} onPrevious={vi.fn()}>{children}</DetailSheet>;
  const closeButton = () => screen.getByRole('button', { name: /^Close and / });
  afterEach(() => { detailTrail.clear(); vi.restoreAllMocks(); });

  it('opened from a lesson: Close goes back to the lesson, stepping over form switches on the same card, with no grid arrows', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/lessons/l1', 100);
    detailTrail.replace({ label: 'Lesson (西)', href: window.location.href });
    visit('/characters?tab=Radicals&id=Radicals:襾', 101);
    const onClose = vi.fn();
    const view = render(sheet(onClose, 'Details for 襾', <div className="form-switch"><a href="/characters?tab=Radicals&id=Radicals:襾&variant=146-2" onClick={e => e.preventDefault()}>西</a></div>));
    fireEvent.click(screen.getByText('西'));
    visit('/characters?tab=Radicals&id=Radicals:襾&variant=146-2', 102);
    view.rerender(sheet(onClose, 'Details for 襾 146-2'));
    expect(screen.queryByRole('button', { name: 'Next card in this list' })).not.toBeInTheDocument();
    expect(closeButton()).toHaveAccessibleName('Close and return to Lesson (西)');
    fireEvent.click(closeButton());
    expect(go).toHaveBeenCalledWith(-2);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opened from a lesson: Back also steps over form switches on the same card', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/lessons/l1', 100);
    detailTrail.replace({ label: 'Lesson (西)', href: window.location.href });
    visit('/characters?tab=Radicals&id=Radicals:襾', 101);
    const view = render(sheet(vi.fn(), 'Details for 襾', <div className="form-switch"><a href="/characters?tab=Radicals&id=Radicals:襾&variant=146-2" onClick={e => e.preventDefault()}>西</a></div>));
    fireEvent.click(screen.getByText('西'));
    visit('/characters?tab=Radicals&id=Radicals:襾&variant=146-2', 102);
    view.rerender(sheet(vi.fn(), 'Details for 襾 146-2'));
    // Back names the lesson, not the previous form of this same card.
    fireEvent.click(screen.getByRole('button', { name: 'Back to Lesson (西)' }));
    expect(go).toHaveBeenCalledWith(-2);
  });

  it('opened from its own grid: a form switch alone offers no Back', () => {
    visit('/characters?tab=Radicals', 400);
    visit('/characters?tab=Radicals&id=Radicals:襾', 401);
    const view = render(sheet(vi.fn(), 'Details for 襾', <div className="form-switch"><a href="/characters?tab=Radicals&id=Radicals:襾&variant=146-2" onClick={e => e.preventDefault()}>西</a></div>));
    fireEvent.click(screen.getByText('西'));
    visit('/characters?tab=Radicals&id=Radicals:襾&variant=146-2', 402);
    view.rerender(sheet(vi.fn(), 'Details for 襾 146-2'));
    expect(screen.queryByRole('button', { name: /^Back to / })).not.toBeInTheDocument();
  });

  it('reached from another card by a link: Close returns to that card', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/characters?id=Characters:了', 200);
    const view = render(sheet(vi.fn(), 'Details for 了', <a href="/characters?id=Characters:瞭" onClick={e => e.preventDefault()}>瞭</a>));
    fireEvent.click(screen.getByText('瞭'));
    visit('/characters?id=Characters:瞭', 201);
    view.rerender(sheet(vi.fn(), 'Details for 瞭'));
    fireEvent.click(closeButton());
    expect(go).toHaveBeenCalledWith(-1);
  });

  it('related-character tiles keep Back and Close pointed at the lesson after a replacement', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/lessons/l1', 600);
    detailTrail.replace({ label: 'Lesson', href: window.location.href });
    visit('/characters?id=Characters:发', 601);
    const view = render(sheet(vi.fn(), 'Details for 发', <div className="related-forms"><a className="related-form-choice" href="/characters?id=Characters:發" onClick={e => e.preventDefault()}>發</a></div>));
    fireEvent.click(screen.getByText('發'));
    window.history.replaceState({ __TSR_index: 601, __TSR_key: 'related' }, '', '/characters?id=Characters:發');
    recordVisit();
    view.rerender(sheet(vi.fn(), 'Details for 發'));
    expect(screen.queryByRole('button', { name: 'Back to 襾' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Lesson' }));
    expect(go).toHaveBeenLastCalledWith(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Close and return to Lesson' }));
    expect(go).toHaveBeenLastCalledWith(-1);
  });

  it('related-character tiles opened from the grid add no Back destination', () => {
    visit('/characters', 610);
    visit('/characters?id=Characters:发', 611);
    const onClose = vi.fn();
    const view = render(sheet(onClose, 'Details for 发', <div className="related-forms"><a className="related-form-choice" href="/characters?id=Characters:髮" onClick={e => e.preventDefault()}>髮</a></div>));
    fireEvent.click(screen.getByText('髮'));
    window.history.replaceState({ __TSR_index: 611, __TSR_key: 'related-grid' }, '', '/characters?id=Characters:髮');
    recordVisit();
    view.rerender(sheet(onClose, 'Details for 髮'));
    expect(screen.queryByRole('button', { name: /^Back to / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close and show card in list' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opened from another page without a recorded step (Start): Close goes back to it', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/', 300);
    visit('/characters?id=Characters:日', 301);
    render(sheet(vi.fn()));
    expect(closeButton()).toHaveAccessibleName('Close and return to the previous page');
    fireEvent.click(closeButton());
    expect(go).toHaveBeenCalledWith(-1);
  });

  it('opened from its own grid: Close returns to the grid and the arrows stay, even after form switches', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/characters?tab=Radicals', 400);
    visit('/characters?tab=Radicals&id=Radicals:襾', 401);
    const onClose = vi.fn();
    const view = render(sheet(onClose, 'Details for 襾', <div className="form-switch"><a href="/characters?tab=Radicals&id=Radicals:襾&variant=146-2" onClick={e => e.preventDefault()}>西</a></div>));
    fireEvent.click(screen.getByText('西'));
    visit('/characters?tab=Radicals&id=Radicals:襾&variant=146-2', 402);
    view.rerender(sheet(onClose, 'Details for 襾 146-2'));
    expect(screen.getByRole('button', { name: 'Next card in this list' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close and show card in list' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(go).not.toHaveBeenCalled();
  });

  it('ignores a stale step left before the window opened (Sound chart visited earlier)', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    visit('/pinyin?s=xi', 500);
    detailTrail.replace({ label: 'xī', href: window.location.href });
    visit('/characters', 501);
    visit('/characters?id=Characters:西', 502);
    const onClose = vi.fn();
    render(sheet(onClose));
    fireEvent.click(screen.getByRole('button', { name: 'Close and show card in list' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(go).not.toHaveBeenCalled();
  });
});

