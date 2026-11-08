import { rememberOrigin } from '@/lib/practice-return';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from './workspace';
// Seções indentadas na navegação: as da biblioteca de caracteres (rota simples
// sem `tab` abre a aba Characters) e as abas Words/Phrases do Vocabulary.
const characterSections = ['Characters', 'Components', 'Radicals', 'Strokes'] as const;
const vocabularySections = [{ label: 'Words', tab: 'word' }, { label: 'Phrases', tab: 'phrase' }] as const;
import { LayoutGrid, BookOpen, Settings, Gamepad2, Layers, Library, Brush, ArrowUpRight, ChevronsLeft, ChevronRight, Menu, X, Search, CircleHelp, ArrowRight, Sun, Moon, Type, Sprout, Puzzle, PenTool, AlignLeft, Quote, Maximize2, Minimize2, AudioLines, Grid3x3, Activity, Ear, Keyboard, Pin, PinOff } from 'lucide-react';
import { NAV_MEDIUM_MAX, NAV_PINNED_KEY, NAV_SMALL_MAX, navCanPin, navHasMenuButton, navIsDocked, navSizeFor, readNavPinned, type NavSize } from '@/lib/nav-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll } from '@/lib/site-search';
import { SearchHitContent } from './search-hit-content';
import { LibraryViewToggle } from './library-view-toggle';
const navigation = [{ to: '/' as const, name: 'Start', icon: LayoutGrid }, { to: '/characters' as const, name: 'Glyphs', icon: Library }, { to: '/vocabulary' as const, name: 'Vocabulary', icon: BookOpen }, { to: '/flashcards' as const, name: 'Hanzi games', icon: HanziIcon }, { to: '/pinyin' as const, name: 'Pinyin', icon: AudioLines }, { to: '/settings' as const, name: 'Settings', icon: Settings }];
// Os dois jogos ficam como sub-itens indentados de Game; cada um abre a sua rota.
// Pinyin guide modes as sub-items; the chart is the plain route (no `mode`).
const pinyinSections = [{ label: 'Sound chart', mode: undefined, icon: Grid3x3 }, { label: 'Tone quiz', mode: 'tones', icon: Activity }, { label: 'Sound-alikes', mode: 'alikes', icon: Ear }, { label: 'Type what you hear', mode: 'type', icon: Keyboard }] as const;
const gameSections = [{ label: 'Flashcards', path: '/flashcards', icon: Layers }, { label: 'Drawing game', path: '/drawing', icon: Brush }] as const;
/** Nav icon for Hanzi games: the character 字 drawn as an SVG so it sizes and
 * colours like the lucide icons beside it (currentColor, 24×24 viewBox). */
function HanziIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden="true" {...props}><text x="12" y="19.5" textAnchor="middle" fontSize="20" fontWeight="600" lang="zh-CN">字</text></svg>;
}
// Pequeno ícone por secção da biblioteca/vocabulário: cada secção fica assim
// alcançável no trilho de ícones (sidebar colapsada), tal como os sub-itens de
// Game; na sidebar expandida continuam só de texto.
const sectionIcons: Record<string, typeof Gamepad2> = { Characters: Type, Radicals: Sprout, Components: Puzzle, Strokes: PenTool, Words: AlignLeft, Phrases: Quote };
export function TutorShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  // Track the page Practice's Back should return to (exact href incl. search).
  const fullHref = useRouterState({ select: s => s.location.href });
  rememberOrigin(path, fullHref);
  // Abas ativas de Glyphs e Vocabulary, para marcar o sub-item correspondente.
  const activeTab = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('tab') });
  const charactersTab = activeTab;
  const activeMode = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('mode') });
  const vocabularyTab = activeTab === 'phrase' ? 'phrase' : 'word';
  // O breadcrumb nomeia a página exata; dentro dos jogos, o nome do jogo.
  const current = (path === '/flashcards' ? 'Flashcards' : path === '/drawing' ? 'Drawing game' : navigation.find(n => n.to === path)?.name) ?? (path === '/strokes' ? 'Practice' : 'Start');
  const navigate = useNavigate();
  // Menu per window size (see src/lib/nav-layout.ts): large always shown; medium
  // pinned beside the page or hidden behind the hamburger (remembered); small only
  // opens over the page. Undocked menus use the same drawer, never an icon rail.
  const [navSize, setNavSize] = useState<NavSize>('large');
  const [pinned, setPinned] = useState(true);
  useEffect(() => {
    setPinned(readNavPinned(window.localStorage));
    const small = window.matchMedia(`(max-width: ${NAV_SMALL_MAX}px)`);
    const medium = window.matchMedia(`(max-width: ${NAV_MEDIUM_MAX}px)`);
    const sync = () => { setNavSize(navSizeFor(window.innerWidth)); setMobileOpen(false); };
    sync();
    small.addEventListener('change', sync);
    medium.addEventListener('change', sync);
    return () => { small.removeEventListener('change', sync); medium.removeEventListener('change', sync); };
  }, []);
  const hamburgerNav = !navIsDocked(navSize, pinned);
  const savePinned = (value: boolean) => {
    setPinned(value);
    setMobileOpen(false);
    try { window.localStorage.setItem(NAV_PINNED_KEY, String(value)); } catch { /* storage unavailable: keep for this visit */ }
  };
  // Hamburger: on a pinned medium window it hides the menu; otherwise it opens or
  // closes the drawer.
  const onMenuButton = () => { if (navSize === 'medium' && pinned) savePinned(false); else setMobileOpen(open => !open); };
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);
  const [help, setHelp] = useState(false);
  const [searching, setSearching] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState(false);
  useEffect(() => { if (!searching) setExpandedSearch(false); }, [searching]);
  const [query, setQuery] = useState('');
  // Pinyin/Exact toggles inside the global search box, mirroring the library filters.
  const [py, setPy] = useState<'any' | 'pinyin' | 'exact'>('any');
  const [shortcut, setShortcut] = useState('Ctrl K');
  const { preferences, setPreferences, theme, setTheme, items, catalogVersion } = useWorkspace();
  // Keep one ordered result set for both window sizes, including lazy catalogue
  // hydration. Expansion removes only the preview cap, not matching or ordering.
  const allHits = useMemo(() => searchAll(items, query, preferences.includeTraditional, Infinity, py), [items, query, preferences.includeTraditional, py, catalogVersion]);
  const hits = expandedSearch ? allHits : allHits.slice(0, 50);
  useEffect(() => { if (/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)) setShortcut('⌘K'); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const closeSearch = () => { setSearching(false); setQuery(''); };
  const openHit = (hit: (typeof hits)[number]) => {
    closeSearch();
    if (hit.kind === 'Word') navigate({ to: '/vocabulary', search: { q: hit.word.hanzi, word: hit.word.id } });
    else navigate({ to: '/characters', search: { tab: hit.kind === 'Radical' ? 'Radicals' : hit.kind === 'Component' ? 'Components' : 'Characters', character: hit.hanzi } });
  };
  return <div className={`workspace ${hamburgerNav ? 'hamburger-navigation' : ''} ${navHasMenuButton(navSize) ? 'has-menu-button' : ''} ${mobileOpen ? 'nav-expanded' : ''}`}>
    {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <Link to="/" className="brand" aria-label="Mandarin Tutor home"><span className="brand-mark">语</span><span className="brand-copy"><strong>Mandarin<span className="brand-dot">.</span></strong><small>TUTOR / 一步一步</small></span></Link>
      {/* Sub-itens sempre visíveis e indentados na navegação, para acesso direto
          de qualquer página; as abas na página continuam sendo a troca principal. */}
      <nav aria-label="Main navigation">{navigation.map(n => {
        const subs = n.to === '/characters' ? characterSections.map(k => ({ key: k, label: k, to: n.to, search: k === 'Characters' ? {} : { tab: k }, active: k === (charactersTab ?? 'Characters'), icon: sectionIcons[k], cls: 'nav-sub-tab' }))
          : n.to === '/vocabulary' ? vocabularySections.map(s => ({ key: s.label, label: s.label, to: n.to, search: s.tab === 'word' ? {} : { tab: s.tab }, active: s.tab === (vocabularyTab ?? 'word'), icon: sectionIcons[s.label], cls: 'nav-sub-tab' }))
          : n.to === '/pinyin' ? pinyinSections.map(s => ({ key: s.label, label: s.label, to: n.to, search: s.mode ? { mode: s.mode } : {}, active: (activeMode ?? undefined) === s.mode, icon: s.icon as typeof Gamepad2 | undefined, cls: 'nav-sub-tab' }))
          : n.to === '/flashcards' ? gameSections.map(s => ({ key: s.label, label: s.label, to: s.path, search: undefined, active: path === s.path, icon: s.icon as typeof Gamepad2 | undefined, cls: 'nav-sub-game' }))
          : null;
        const selected = n.to === '/flashcards' ? path === '/flashcards' || path === '/drawing' : path === n.to;
        return <div key={n.to}><Button asChild variant="ghost" className={`nav-item ${selected ? 'is-active' : ''}`}><Link to={n.to} onClick={() => setMobileOpen(false)} title={n.name}><n.icon /><span>{n.name}</span>{selected && <span className="active-dot" />}</Link></Button>{subs?.map(s => <Button asChild key={s.key} variant="ghost" className={`nav-sub-item ${s.cls} ${selected && s.active ? 'is-active' : ''}`}><Link to={s.to} search={s.search ?? {}} onClick={() => setMobileOpen(false)} title={`Open ${s.label.toLowerCase()}`}>{s.icon && <s.icon />}<span>{s.label}</span></Link></Button>)}</div>;
      })}</nav>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row">{navCanPin(navSize)
        ? <Button size="icon" variant="ghost" title={pinned ? 'Unpin menu (hide it)' : 'Pin menu beside the page'} aria-label={pinned ? 'Unpin menu' : 'Pin menu'} aria-pressed={pinned} onClick={() => savePinned(!pinned)}>{pinned ? <PinOff/> : <Pin/>}</Button>
        : hamburgerNav && <Button size="icon" variant="ghost" title="Close menu" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><ChevronsLeft/></Button>}</div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><Button variant="ghost" size="icon" className={mobileOpen ? 'mobile-menu close-x' : 'mobile-menu'} aria-label={mobileOpen ? 'Close menu' : hamburgerNav ? 'Open menu' : 'Hide menu'} title={mobileOpen ? 'Close menu' : hamburgerNav ? 'Open menu' : 'Hide menu'} onClick={onMenuButton}>{mobileOpen ? <X/> : <Menu/>}</Button><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/><span>{current}</span></div><div className="topbar-actions"><Button variant="ghost" className="search-trigger" title={`Search everything (${shortcut})`} aria-label={`Search everything (${shortcut})`} onClick={() => setSearching(true)}><Search/><span>Search</span><kbd>{shortcut}</kbd></Button><LibraryViewToggle/><span className="header-divider"/><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</Button><div className="font-toggle" role="group" aria-label="Character style"><Button variant="ghost" type="button" className={preferences.font === 'Handwritten' ? 'active' : ''} data-font="handwritten" aria-pressed={preferences.font === 'Handwritten'} aria-label="Handwritten characters" title="Handwritten characters" onClick={() => setPreferences({ ...preferences, font: 'Handwritten' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Sans' ? 'active' : ''} data-font="sans" aria-pressed={preferences.font === 'Sans'} aria-label="Clean sans characters" title="Clean sans characters" onClick={() => setPreferences({ ...preferences, font: 'Sans' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Print' ? 'active' : ''} data-font="print" aria-pressed={preferences.font === 'Print'} aria-label="Print (song) characters" title="Print (song) characters" onClick={() => setPreferences({ ...preferences, font: 'Print' })}>永</Button></div><span className="header-divider"/><span className="learning-status"><span className="status-dot"/>One step at a time</span><Button asChild variant="ghost" className="avatar" title="Learning preferences"><Link to="/settings" aria-label="Learning preferences">学</Link></Button></div></header>
      <main className="main-content">{children}</main></div>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>A character, its parts, then a little practice.</DialogDescription><div className="help-content"><p><strong>Study.</strong> Browse characters, radicals and components with sourced breakdowns and usage ranks. Apply filters together; × clears them.</p><p><strong>Practise.</strong> Write in Trace or Recall, or play Flashcards and the Drawing game under Hanzi games.</p><p><strong>Pinyin.</strong> Hear every syllable in all four tones, recorded by a real speaker, in the Sound chart. Then test your ear with the Tone quiz, Sound-alikes and Type what you hear. Your progress is remembered in this browser.</p><p><strong>Vocabulary</strong> is a partial HSK 1–2 collection for now.</p><p>A dimmed speaker means your device voice is speaking. Preferences stay saved in this browser.</p><Button asChild onClick={() => setHelp(false)}><Link to="/characters">Explore characters <ArrowRight/></Link></Button></div></DialogContent></Dialog>
    <Dialog open={searching} onOpenChange={setSearching}><DialogContent className={`global-search${expandedSearch ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); openHit(hits[0]); } }}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
      <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>
      {query.trim() === '' ? <p className="global-search-hint">Start typing — results appear as you go. Press Enter to open the first one.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{hits.map(hit => <Button variant="ghost" type="button" key={hit.kind === 'Word' ? `w-${hit.word.id}` : `${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><SearchHitContent hit={hit}/></Button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
      {query.trim() !== '' && hits.length > 0 && <div className="global-search-foot"><span>{!expandedSearch && allHits.length > 50 ? `50 of ${allHits.length.toLocaleString()} matches` : `${allHits.length.toLocaleString()} ${allHits.length === 1 ? 'match' : 'matches'}`}</span><Button variant="ghost" type="button" aria-expanded={expandedSearch} onClick={() => setExpandedSearch(value => !value)}>{expandedSearch ? <Minimize2/> : <Maximize2/>}{expandedSearch ? 'Compact window' : 'Show all results'}</Button></div>}
    </DialogContent></Dialog>
  </div>;
}
