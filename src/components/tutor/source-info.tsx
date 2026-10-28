import type { ReactNode } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Source/verification metadata, collapsed behind a small button; `inline` places it beside a section label. */
export function SourceInfo({ className, children, inline = false, variant = 'info' }: {
  className: string; children: ReactNode; inline?: boolean; variant?: 'info' | 'warning';
}) {
  const trigger = <PopoverTrigger className="source-info-trigger" aria-label="Source details">
    {variant === 'warning' ? <TriangleAlert aria-hidden="true"/> : <Info aria-hidden="true"/>}
  </PopoverTrigger>;
  return <Popover>
    {inline ? trigger : <><p className={`${className} source-info-inline`}>{children}</p>{trigger}</>}
    <PopoverContent className="source-info-popover" align="start"><p className={className}>{children}</p></PopoverContent>
  </Popover>;
}
