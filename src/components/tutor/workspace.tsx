import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { words, type Word } from '@/lib/mandarin';
type Preferences = { pinyin: boolean; meaning: boolean; slow: boolean; font: string };
type Workspace = { items: Word[]; addWord: (word: Word) => void; saved: string[]; toggleSaved: (id: string) => void; preferences: Preferences; setPreferences: (value: Preferences) => void };
const WorkspaceContext = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(words);
  const [saved, setSaved] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ pinyin: true, meaning: true, slow: false, font: 'Sans' });
  useEffect(() => { document.documentElement.dataset['hanziFont'] = preferences.font.toLowerCase(); }, [preferences.font]);
  return <WorkspaceContext.Provider value={{ items, addWord: w => setItems(prev => [...prev, w]), saved, toggleSaved: id => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), preferences, setPreferences }}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('WorkspaceProvider is required'); return value; }
