import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { words, type Word } from '@/lib/mandarin';
import { DrawingSessionProvider } from './drawing-session';
import { loadCatalog, catalog } from '@/lib/catalog-store';
import { defaultPreferences, defaultTheme, restoredTheme, restoredLibraryView, includeScript, type Preferences } from '@/lib/learning-preferences';
type Workspace = { items: Word[]; addWord: (word: Word) => void; saved: string[]; toggleSaved: (id: string) => void; preferences: Preferences; setPreferences: (value: Preferences) => void; theme: 'light' | 'dark'; setTheme: (value: 'light' | 'dark') => void; catalogVersion: number };
/** Independently subscribed, session-only reveals survive route unmounts without
 * rerendering the entire workspace or persisting record IDs in browser storage. */
const CardRevealsContext = createContext<{ revealed: ReadonlySet<string>; setRevealed: Dispatch<SetStateAction<ReadonlySet<string>>> } | null>(null);
export function useSessionCardReveals() { return useContext(CardRevealsContext); }
// Shared session records/bookmarks and persisted display preferences live here;
// page selections and applied filters belong to route search, not this context.
const WorkspaceContext = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Imported records must stay live when corrected; only session additions belong in state.
  const [sessionItems, setSessionItems] = useState<Word[]>([]);
  const items = [...words, ...sessionItems];
  const [saved, setSaved] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  // Restore browser preferences after hydration. Gate writes until restoration
  // finishes so first-render defaults cannot overwrite a saved preference.
  const [theme, setTheme] = useState<'light' | 'dark'>(defaultTheme);
  const [catalogVersion, setCatalogVersion] = useState(0);
  useEffect(() => { loadCatalog().then(() => setCatalogVersion(catalog.version)).catch(() => { /* catalogue unavailable; screens show loading/empty states */ }); }, []);
  useEffect(() => { try { setTheme(restoredTheme(localStorage.getItem('tutor-theme'))); } catch { /* storage may be unavailable */ } }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); if (loaded) { try { localStorage.setItem('tutor-theme', theme); } catch { /* storage may be unavailable */ } } }, [theme, loaded]);
  useEffect(() => {
    let stored: Partial<Preferences> = {};
    try { const raw = localStorage.getItem('tutor-preferences'); if (raw) stored = JSON.parse(raw) ?? {}; } catch { /* unavailable or invalid storage uses device defaults */ }
    // Apply the mobile default only once, not on resize or after a saved choice.
    const libraryView = restoredLibraryView(stored.libraryView, window.matchMedia('(max-width: 850px)').matches);
    setPreferences(p => ({ ...p, ...stored, libraryView }));
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem('tutor-preferences', JSON.stringify(preferences)); }, [preferences, loaded]);
  useEffect(() => { document.documentElement.dataset['hanziFont'] = preferences.font.toLowerCase(); }, [preferences.font]);
  // Root-level sizing also reaches dropdowns and dialogs rendered in portals.
  useEffect(() => { document.documentElement.dataset['displaySize'] = preferences.libraryView === 'list' ? 'comfortable' : 'compact'; }, [preferences.libraryView]);
  return <WorkspaceContext.Provider value={{ items: items.filter(w => includeScript(w.script, preferences.includeTraditional)), addWord: w => setSessionItems(prev => [...prev, w]), saved, toggleSaved: id => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), preferences, setPreferences, theme, setTheme, catalogVersion }}><CardRevealsContext.Provider value={{ revealed, setRevealed }}><DrawingSessionProvider>{children}</DrawingSessionProvider></CardRevealsContext.Provider></WorkspaceContext.Provider>;
}
export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('WorkspaceProvider is required'); return value; }
