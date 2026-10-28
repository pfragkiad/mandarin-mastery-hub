import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { practiceMode, type PracticeMode } from '@/lib/practice-mode';

export function PracticeModeTabs({ mode, onChange }: { mode: PracticeMode; onChange?: (mode: PracticeMode) => void }) {
  return <Tabs value={mode} onValueChange={value => onChange?.(practiceMode(value))} className="practice-mode-tabs">
    <TabsList aria-label="Writing practice mode" className="grid w-full grid-cols-3">
      <TabsTrigger value="watch">Watch</TabsTrigger>
      <TabsTrigger value="trace">Trace</TabsTrigger>
      <TabsTrigger value="recall">Recall</TabsTrigger>
    </TabsList>
  </Tabs>;
}