import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Source/verification metadata: always collapsed behind a small (i) button. */
export function SourceInfo({ className, children }: { className: string; children: ReactNode }) {
  return <>
    <p className={`${className} source-info-inline`}>{children}</p>
    <Popover>
      <PopoverTrigger className="source-info-trigger" aria-label="Source details"><Info aria-hidden="true"/></PopoverTrigger>
      <PopoverContent className="source-info-popover" align="start"><p className={className}>{children}</p></PopoverContent>
    </Popover>
  </>;
}
