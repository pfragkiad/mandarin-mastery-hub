import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

/** Small board-local celebration. Explicit completion events trigger it, never
 * restored answers. The live preference and reduced-motion setting suppress it. */
export function usePerfectCelebration(enabled: boolean) {
  const [burst, setBurst] = useState(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const celebrate = useCallback((accuracy: number | null) => {
    if (accuracy !== 100 || !enabledRef.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setBurst(n => n + 1);
  }, []);
  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(0), 1300);
    return () => window.clearTimeout(timer);
  }, [burst]);
  const effect = enabled && burst ? <div key={burst} className="perfect-confetti" aria-hidden="true">
    {Array.from({ length: 24 }, (_, i) => <i key={i} style={{
      '--confetti-x': `${Math.cos(i * 2.4) * (65 + i % 4 * 15)}px`,
      '--confetti-y': `${-65 - i % 5 * 20}px`,
      '--confetti-turn': `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
    } as CSSProperties}/>)}
  </div> : null;
  return { celebrate, effect };
}