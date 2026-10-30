import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audioMessage, playPronunciation, recordingCandidates, type AudioRequest } from '@/lib/audio';
import { useWorkspace } from './workspace';
import { usePronunciationAvailability } from './use-pronunciation-availability';

export function ExamplePronunciation({ request, label }: { request: AudioRequest; label: string }) {
  const { preferences } = useWorkspace();
  const [error, setError] = useState<string | null>(null);
  const hasRecording = recordingCandidates(request).length > 0;
  const available = usePronunciationAvailability(hasRecording, request.reading);
  return <>
    <Button variant="ghost" size="icon" className={`example-listen${hasRecording ? '' : ' audio-tts-only'}`} disabled={!available} aria-label={`Listen to ${label}`} title={available ? hasRecording ? 'Listen · Recording' : 'Browser speech · no recording' : 'No audio available on this device'} onClick={async () => setError(audioMessage(await playPronunciation(request, preferences.slow)))}><Volume2/></Button>
    {error && <span role="status" className="example-audio-error">{error}</span>}
  </>;
}