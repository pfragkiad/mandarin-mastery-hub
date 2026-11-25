import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { loadCharacterSentenceAvailability } from '@/lib/character-tatoeba-examples';

/** Exact-card sentence availability from a small lazy index. Sentence bodies and
 * review details load only when a character detail card needs the fallback.
 */
export function CharacterSentenceIndicator({ recordId }: { recordId: string }) {
  const [loaded, setLoaded] = useState<{ recordId: string; available: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadCharacterSentenceAvailability(recordId).then(available => {
      if (!cancelled) setLoaded({ recordId, available });
    });
    return () => { cancelled = true; };
  }, [recordId]);
  return loaded?.recordId === recordId && loaded.available
    ? <span title="In a sentence available"><Quote className="catalog-source-icon" aria-label="In a sentence available"/></span>
    : null;
}
