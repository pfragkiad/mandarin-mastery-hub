import { useEffect, useState } from 'react';

/** Hydration-safe breakpoint shared by phone library controls in both display modes. */
export function useSmallLibraryScreen() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setSmall(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return small;
}