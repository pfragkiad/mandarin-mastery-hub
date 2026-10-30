import { Volume2 } from 'lucide-react';
import type { SyntheticEvent } from 'react';

/** Speaker control embedded inside a clickable card tile. The tile itself is a real
 *  <button>, so this renders as a role="button" span that swallows activation so the
 *  tile does not open when the speaker is used. Colours match the detail column's
 *  audio control: bright when audio exists, muted grey when it does not. */
export function TileSpeaker({ available, label, unavailableLabel, title, onActivate }: {
  available: boolean;
  label: string;
  unavailableLabel?: string;
  title?: string;
  onActivate: () => void;
}) {
  const activate = (event: SyntheticEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (available) onActivate();
  };
  return <span
    role="button"
    tabIndex={available ? 0 : -1}
    aria-label={available ? label : unavailableLabel ?? 'No audio available'}
    aria-disabled={available ? undefined : true}
    title={available ? title : undefined}
    className="tile-speaker"
    onClick={activate}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') activate(event); }}
  ><Volume2/></span>;
}
