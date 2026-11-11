import { Link } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GameIcon } from './game-catalog';

/** One sub-item of a nav group (a library section, a vocabulary tab, a game). */
export type NavSub = { key: string; label: string; to: string; search?: Record<string, string> | undefined; active: boolean; icon?: GameIcon | undefined; cls: string };

/**
 * One main menu item plus its sub-items.
 *
 * Full menu / phone drawer: the sub-items sit indented under the main item, always
 * visible (no pop-up there). Slim icon strip (`rail`): only the main icon shows;
 * its sub-items open in a labelled flyout beside the strip, so they never appear as
 * bare icons. The flyout opens on mouse hover, on keyboard focus (focus-visible, so
 * a click's focus doesn't leave it open over the page) and, for touch, on the first
 * tap of the main item (a second tap follows the link). It closes on leaving the
 * group, Escape (focus returns to the main item), a tap outside or choosing an item.
 *
 * Inputs: the main item (`name`, `to`, `icon`, `selected`), its `subs`, `rail`,
 * `onNavigate` (closes the phone drawer), and `open`/`onOpenChange` — the shell owns
 * which group's flyout is open, so opening one always closes the other. State: the
 * flyout's position. It is `position: fixed`, because the strip scrolls (overflow)
 * and would clip an absolutely positioned panel; top is read from the main item and
 * clamped so the panel never runs past the bottom of the window.
 */
export function NavGroup({ name, to, icon: MainIcon, selected, subs, rail, onNavigate, open: openProp, onOpenChange }: { name: string; to: string; icon: GameIcon; selected: boolean; subs: NavSub[] | null; rail: boolean; onNavigate: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  const flyoutEnabled = rail && Boolean(subs?.length);
  const open = flyoutEnabled && openProp;
  const setOpen = onOpenChange;
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const groupRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLAnchorElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef<string>('mouse');
  // Escape hands focus back to the main item; that focus must not reopen the flyout.
  const returningFocus = useRef(false);
  const id = `nav-flyout-${to.replace(/\W/g, '') || 'start'}`;

  const show = () => {
    window.clearTimeout(closeTimer.current);
    const link = mainRef.current;
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const edge = link.closest('aside')?.getBoundingClientRect().right ?? rect.right;
    setPos({ top: rect.top, left: edge });
    setOpen(true);
  };
  // A short grace period lets the pointer cross the strip's edge into the flyout.
  const hideSoon = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(false), 160); };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  // Leaving the strip (window widens to the full menu, or a phone drawer) closes it.
  useEffect(() => { if (!flyoutEnabled && openProp) setOpen(false); }, [flyoutEnabled, openProp]);

  // Keep the panel inside the window: shift it up when it would overflow the bottom.
  useLayoutEffect(() => {
    if (!open || !flyoutRef.current) return;
    const height = flyoutRef.current.getBoundingClientRect().height;
    const maxTop = window.innerHeight - height - 8;
    if (pos.top > maxTop) setPos(p => ({ ...p, top: Math.max(8, maxTop) }));
  }, [open, pos.top]);

  // Escape closes and hands focus back; a tap or click outside the group closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); returningFocus.current = true; mainRef.current?.focus(); returningFocus.current = false; } };
    const onDown = (e: PointerEvent) => { if (!groupRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return <div ref={groupRef} className="nav-group"
    onPointerEnter={e => { if (flyoutEnabled && e.pointerType !== 'touch') show(); }}
    onPointerLeave={e => { if (flyoutEnabled && e.pointerType !== 'touch') hideSoon(); }}
    onBlur={e => { if (flyoutEnabled && !groupRef.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <Button asChild variant="ghost" className={`nav-item ${selected ? 'is-active' : ''}`}>
      <Link ref={mainRef} to={to} title={name}
        aria-expanded={flyoutEnabled ? open : undefined} aria-controls={flyoutEnabled && open ? id : undefined}
        onPointerDown={e => { pointerType.current = e.pointerType; }}
        onFocus={e => { if (flyoutEnabled && !returningFocus.current && e.currentTarget.matches(':focus-visible')) show(); }}
        onClick={e => {
          // Touch has no hover: the first tap opens the flyout instead of leaving the page.
          if (flyoutEnabled && pointerType.current === 'touch' && !open) { e.preventDefault(); show(); return; }
          setOpen(false); onNavigate();
        }}>
        <MainIcon/><span>{name}</span>{selected && <span className="active-dot"/>}
      </Link>
    </Button>
    {!rail && subs?.map(s => <Button asChild key={s.key} variant="ghost" className={`nav-sub-item ${s.cls} ${selected && s.active ? 'is-active' : ''}`}><Link to={s.to} search={s.search ?? {}} onClick={onNavigate} title={`Open ${s.label.toLowerCase()}`}>{s.icon && <s.icon/>}<span>{s.label}</span></Link></Button>)}
    {flyoutEnabled && open && <div ref={flyoutRef} id={id} className="nav-flyout" role="group" aria-label={name} style={{ top: pos.top, left: pos.left }}>
      <span className="nav-flyout-title" aria-hidden="true">{name}</span>
      {subs!.map(s => <Button asChild key={s.key} variant="ghost" className={`nav-flyout-item ${selected && s.active ? 'is-active' : ''}`}><Link to={s.to} search={s.search ?? {}} onClick={() => { setOpen(false); onNavigate(); }}>{s.icon && <s.icon/>}<span>{s.label}</span></Link></Button>)}
    </div>}
  </div>;
}
