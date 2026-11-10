import { useEffect, useState } from 'react';

/** Hydration-safe breakpoint shared by tablet/phone filters and Study controls.
 * Switch before the docked sidebar and Sound card squeeze the search field;
 * src/styles.css uses the same 1280px boundary for these controls only. */
export function useSmallLibraryScreen() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1280px)');
    const update = () => setSmall(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return small;
}