import { useLayoutEffect, useRef, useState } from 'react';

/** Sliding selection frame for Practice's form switch (script-forms.tsx / radical-forms.tsx in
 * their `layout="switch"` tray): one absolutely-positioned box inside the tray that glides from
 * the form you were on to the form you pick, instead of the border simply appearing on the new
 * tile. The tiles stay transparent, so the frame's tint reads as the tile's own fill.
 *
 * Inputs: none. It finds the tray it is rendered in (`.radical-form-list`) and the tile marked
 * `.is-selected`, so the script picker (Simplified/Traditional) and the radical-family picker
 * (Kangxi heading / Mainland form / Variant) share one implementation and one colour rule.
 *
 * State: the frame's box inside the tray, the identity ink of the tile it covers (green
 * character, gold radical, purple traditional) and whether it may animate right now.
 *
 * Tricky: Practice's page is keyed by the practised character (routes/strokes.tsx), so choosing
 * another form *remounts* the tray — a transition alone would have nothing to animate from. The
 * frame therefore leaves a note of its own box (measured inside the tray, so a tray that moved
 * or resized between records cannot drag the next frame off screen) when it is unmounted and, on
 * the way in, starts from that note before gliding to the new tile. The note is only trusted
 * while it is fresh — one pick, not a return to Practice much later — and is clamped into the
 * new tray, so a stale note can never make the border fly in from outside it. React's dev double
 * effect is handled too: a mount unmounted before it was ever painted hands the note back
 * untouched, so the mount the learner actually sees still slides. */
type Box = { x: number; y: number; w: number; h: number };
/** The box the outgoing frame sat in, inside its own tray, and when it was left behind. */
let outgoing: Box & { at: number } | null = null;
/** Slide duration; kept in sync with the transition in styles.css. */
const GLIDE_MS = 240;
/** A note older than this came from an earlier visit to Practice, not from picking another form. */
const NOTE_MS = 1500;
/** A mount unmounted faster than this was never painted: React's StrictMode double effect. */
const DOUBLE_EFFECT_MS = 100;

export function FormSwitchThumb() {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ink, setInk] = useState('is-character');
  const [gliding, setGliding] = useState(false);

  useLayoutEffect(() => {
    const thumb = ref.current;
    const list = thumb?.parentElement;
    if (!thumb || !list) return;
    let live = true;
    // Resize-driven re-measures only take over once the mount slide is over: the observer's
    // first delivery lands in the same frame as the slide and would cancel it.
    let settled = false;
    const mountedAt = performance.now();
    const consumed = outgoing;
    /** The selected tile's box inside the tray's padding box (where an absolutely positioned
     *  child at left/top 0 lands), the tray's own padding box and the identity classes the
     *  frame has to wear. */
    const measure = () => {
      const selected = list.querySelector<HTMLElement>('.radical-form-choice.is-selected');
      if (!selected) return null;
      const row = list.getBoundingClientRect();
      const tile = selected.getBoundingClientRect();
      return {
        box: { x: tile.left - row.left - list.clientLeft, y: tile.top - row.top - list.clientTop, w: tile.width, h: tile.height },
        tray: { w: row.width - list.clientLeft * 2, h: row.height - list.clientTop * 2 },
        // A form that is both traditional and a radical wears both identity classes, so the
        // frame takes the mixed ink (styles.css .form-switch-thumb.is-radical.is-traditional).
        ink: selected.classList.contains('is-traditional')
          ? selected.classList.contains('is-radical') ? 'is-radical is-traditional' : 'is-traditional'
          : selected.classList.contains('is-radical') ? 'is-radical' : 'is-character',
      };
    };
    const first = measure();
    if (!first) return;
    setInk(first.ink);
    const note = outgoing && Date.now() - outgoing.at < NOTE_MS ? outgoing : null;
    // Clamped into this tray: a note from a narrower or taller one starts at its edge instead
    // of off screen.
    const start: Box | null = note ? {
      x: Math.min(Math.max(note.x, -note.w + 8), first.tray.w - 8),
      y: Math.min(Math.max(note.y, -note.h + 8), first.tray.h - 8),
      w: note.w,
      h: note.h,
    } : null;
    const slides = start !== null
      && (Math.abs(start.x - first.box.x) > 1 || Math.abs(start.y - first.box.y) > 1
        || Math.abs(start.w - first.box.w) > 1 || Math.abs(start.h - first.box.h) > 1);
    let last: Box & { at: number } = { ...first.box, at: Date.now() };
    let timer = 0;
    if (slides && start) {
      // Write the outgoing box straight onto the element and force a style flush: React's own
      // render would land both boxes in the same paint, and a transition needs a computed
      // start style to run from.
      thumb.style.transform = `translate(${start.x}px, ${start.y}px)`;
      thumb.style.width = `${start.w}px`;
      thumb.style.height = `${start.h}px`;
      void thumb.offsetWidth;
      requestAnimationFrame(() => {
        if (!live) return;
        setGliding(true);
        setBox(first.box);
        timer = window.setTimeout(() => { settled = true; setGliding(false); }, GLIDE_MS + 60);
      });
    } else {
      setBox(first.box);
      settled = true;
    }
    outgoing = last;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (!settled) return;
      const next = measure();
      if (!next) return;
      last = { ...next.box, at: Date.now() };
      setBox(next.box);
      setInk(next.ink);
      outgoing = last;
    });
    observer?.observe(list);
    list.querySelectorAll('.radical-form-choice').forEach(tile => observer?.observe(tile));
    return () => {
      live = false;
      window.clearTimeout(timer);
      observer?.disconnect();
      // A mount that was never painted (React's dev double effect) hands back the note it read
      // instead of the box it was heading for, so the mount the learner sees still slides.
      outgoing = performance.now() - mountedAt < DOUBLE_EFFECT_MS && consumed
        ? { ...consumed, at: Date.now() }
        : { ...last, at: Date.now() };
    };
  }, []);

  return <span
    ref={ref}
    aria-hidden="true"
    className={`form-switch-thumb${box ? ' is-visible' : ''}${gliding ? ' is-gliding' : ''} ${ink}`}
    style={box ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h } : undefined}
  />;
}
