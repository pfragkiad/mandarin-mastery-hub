import { useEffect, useState } from 'react';
import { pronunciationAvailable, ttsAvailable } from '@/lib/audio';

export function usePronunciationAvailability(hasRecording: boolean, reading?: string | null) {
  const [hasVoice, setHasVoice] = useState(false);
  useEffect(() => {
    const refresh = () => setHasVoice(ttsAvailable());
    refresh();
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);
  return pronunciationAvailable(hasRecording, reading, hasVoice);
}