import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Splits hint content at its <br/> separators (looking inside fragments) into rows, so
 *  every hint renders as the same tidy list of separated lines instead of a raw block. */
export function hintRows(children: ReactNode): ReactNode[][] {
  const rows: ReactNode[][] = [[]];
  const walk = (node: ReactNode) => Children.forEach(node, child => {
    if (isValidElement(child) && child.type === Fragment) { walk((child as ReactElement<{ children?: ReactNode }>).props.children); return; }
    if (isValidElement(child) && child.type === 'br') { rows.push([]); return; }
    if (child === null || child === undefined || child === false || child === '') return;
    rows[rows.length - 1]!.push(child);
  });
  walk(children);
  return rows.filter(row => row.length > 0);
}

/** Shared hint card body: one row per line with thin dividers (used by every (i) and Details popover). */
export function HintBody({ className, children }: { className?: string | undefined; children: ReactNode }) {
  const rows = hintRows(children);
  return <ul className={`hint-rows ${className ?? ''}`}>{rows.map((row, index) => <li key={index}>{row}</li>)}</ul>;
}

/** Source/verification metadata, collapsed behind a small button; `inline` places it beside a section label. */
export function SourceInfo({ className, children, inline = false, variant = 'info' }: {
  className: string; children: ReactNode; inline?: boolean; variant?: 'info' | 'warning';
}) {
  const trigger = <PopoverTrigger className="source-info-trigger" aria-label="Source details">
    {variant === 'warning' ? <TriangleAlert aria-hidden="true"/> : <Info aria-hidden="true"/>}
  </PopoverTrigger>;
  return <Popover>
    {inline ? trigger : <><p className={`${className} source-info-inline`}>{children}</p>{trigger}</>}
    <PopoverContent className="source-info-popover" align="start"><HintBody>{children}</HintBody></PopoverContent>
  </Popover>;
}
