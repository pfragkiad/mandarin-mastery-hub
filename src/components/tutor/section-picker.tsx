import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SectionStat } from '@/lib/section-switch';
import type { GameIcon } from './game-catalog';

/** One choice in the header section switcher: a real router link (route + search). */
export type SectionOption = { key: string; label: string; icon: GameIcon; to: string; search?: Record<string, string>; group?: string };

/**
 * Header section switcher: the last breadcrumb step ("Components ▾") is a dropdown
 * button listing the page's sections — Glyphs kinds, Vocabulary Words/Phrases, or
 * the five games grouped by family — and replaces the page's own pill row at every
 * width (on phones it sits in the header title, beside the page name).
 *
 * Inputs: `page` (the parent name, for the accessible label), `options`, the
 * `active` key, optional per-section `stats` (count plus coloured "+N" extras,
 * published by the page through section-switch.ts) and `beforeSwitch` (run before
 * leaving for another section, e.g. to stop Pinyin audio). No state of its own:
 * Radix owns open/closed; each item is a router Link, so picking a section pushes
 * history exactly like the side menu's sub-items, and Back restores it.
 */
export function SectionPicker({ page, options, active, stats, beforeSwitch }: { page: string; options: SectionOption[]; active: string; stats?: Record<string, SectionStat> | undefined; beforeSwitch?: (() => void) | undefined }) {
  const current = options.find(o => o.key === active) ?? options[0]!;
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger className="section-picker" aria-label={`${page}: ${current.label}. Switch section`} title={`Switch ${page.toLowerCase()} section`}>
      <span className="section-picker-label">{current.label}</span><ChevronDown aria-hidden="true"/>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" sideOffset={8} collisionPadding={12} className="section-picker-menu">
      {options.map((o, i) => {
        const stat = stats?.[o.key];
        const isActive = o.key === current.key;
        // Game families get a small heading; a divider separates the second family.
        const heading = o.group && o.group !== options[i - 1]?.group;
        return <Fragment key={o.key}>
          {heading && i > 0 && <DropdownMenuSeparator/>}
          {heading && <DropdownMenuLabel className="section-picker-group">{o.group}</DropdownMenuLabel>}
          <DropdownMenuItem asChild className={`section-picker-item${isActive ? ' is-active' : ''}`}>
            <Link to={o.to} search={o.search ?? {}} aria-current={isActive ? 'page' : undefined} onClick={() => { if (!isActive) beforeSwitch?.(); }}>
              <o.icon className="section-picker-icon"/>
              <span className="section-picker-name">{o.label}</span>
              {stat && <span className="section-picker-counts">
                <span className="section-picker-count">{stat.count.toLocaleString('en-US')}</span>
                {stat.extras?.filter(x => x.count > 0).map(x => <span key={x.tone} className={`section-picker-extra is-${x.tone}`} title={x.hint} aria-label={`plus ${x.count.toLocaleString('en-US')}: ${x.hint}`}>+{x.count.toLocaleString('en-US')}</span>)}
              </span>}
              <Check className="section-picker-check" aria-hidden="true"/>
            </Link>
          </DropdownMenuItem>
        </Fragment>;
      })}
    </DropdownMenuContent>
  </DropdownMenu>;
}
