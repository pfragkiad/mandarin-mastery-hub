import { useId } from 'react';
import { MoveUpRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { strokeDirectionPoints, type MedianPoint } from '@/lib/stroke-directions';

export function DirectionHintsToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  const id = useId();
  return <label className="direction-hints-toggle" htmlFor={id}><MoveUpRight size={15} aria-hidden="true"/>Stroke arrows<Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled}/></label>;
}

export function StrokeDirectionHints({ medians, activeStroke }: { medians: readonly (readonly MedianPoint[])[]; activeStroke?: number | null }) {
  const id = `stroke-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <svg className="stroke-direction-overlay" viewBox="0 0 300 300" role="img" aria-label="Stroke drawing directions">
    <defs><marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path className="direction-arrowhead" d="M 1 1 L 9 5 L 1 9 Z"/></marker></defs>
    {medians.map((median, index) => {
      if (activeStroke != null && index !== activeStroke) return null;
      const points = strokeDirectionPoints(median);
      const start = points[0];
      if (points.length < 2 || !start) return null;
      const line = points.map(point => point.join(',')).join(' ');
      return <g key={index} data-direction-stroke={index}>
        <polyline className="direction-halo" points={line}/>
        <polyline className="direction-line" points={line} markerEnd={`url(#${id})`}/>
        <circle className="direction-start" cx={start[0]} cy={start[1]} r="6"/>
        <text className="direction-number" x={start[0]} y={start[1]} dy="0.35em" textAnchor="middle">{index + 1}</text>
      </g>;
    })}
  </svg>;
}