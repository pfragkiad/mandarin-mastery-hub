import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { words, type Word } from '@/lib/mandarin';
import { loadCatalog, catalog } from '@/lib/catalog-store';
import { defaultPreferences, includeScript, type Preferences } from '@/lib/learning-preferences';
type Workspace = { items: Word[]; addWord: (word: Word) => void; saved: string[]; toggleSaved: (id: string) => void; preferences: Preferences; setPreferences: (value: Preferences) => void; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; catalogVersion: number };
const WorkspaceContext = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(words);
  const [saved, setSaved] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [catalogVersion, setCatalogVersion] = useState(0);
  useEffect(() => { loadCatalog().then(() => setCatalogVersion(catalog.version)).catch(() => { /* catalogue unavailable; screens show loading/empty states */ }); }, []);
  useEffect(() => { try { const stored = localStorage.getItem('tutor-theme'); setTheme(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'); } catch { /* storage may be unavailable */ } }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); if (loaded) { try { localStorage.setItem('tutor-theme', theme); } catch { /* storage may be unavailable */ } } }, [theme, loaded]);
  useEffect(() => { try { const raw = localStorage.getItem('tutor-preferences'); if (raw) setPreferences(p => ({ ...p, ...JSON.parse(raw) })); } catch { /* ignore */ } setLoaded(true); }, []);
  useEffect(() => { if (loaded) localStorage.setItem('tutor-preferences', JSON.stringify(preferences)); }, [preferences, loaded]);
  useEffect(() => { document.documentElement.dataset['hanziFont'] = preferences.font.toLowerCase(); }, [preferences.font]);
  return <WorkspaceContext.Provider value={{ items: items.filter(w => includeScript(w.script, preferences.includeTraditional)), addWord: w => setItems(prev => [...prev, w]), saved, toggleSaved: id => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), preferences, setPreferences, theme, setTheme, catalogVersion }}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('WorkspaceProvider is required'); return value; }
