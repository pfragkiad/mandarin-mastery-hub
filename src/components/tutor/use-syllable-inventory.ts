import { useEffect, useState } from 'react';
import { loadSyllableInventory, type PinyinSyllable } from '@/lib/pinyin-guide';

/**
 * The attested pinyin syllable inventory, loaded lazily once and shared by every caller
 * (Sound chart links, phrase character ↔ syllable pairing). Returns null until it arrives
 * or when loading fails, so callers simply render without the inventory-dependent extra.
 */
let cached: PinyinSyllable[] | null = null;
export function useSyllableInventory() {
  const [syllables, setSyllables] = useState(cached);
  useEffect(() => {
    if (cached) return;
    let live = true;
    loadSyllableInventory().then(list => { cached = list; if (live) setSyllables(list); }, () => undefined);
    return () => { live = false; };
  }, []);
  return syllables;
}
