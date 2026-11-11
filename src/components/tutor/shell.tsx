import { rememberOrigin } from '@/lib/practice-return';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from './workspace';
import { HanziIcon, HANZI_GAMES, PINYIN_GAMES, PinyinGamesIcon, type GameEntry, type GameIcon } from './game-catalog';
import { NavGroup, type NavSub } from './nav-group';
// Seções indentadas na navegação: as da biblioteca de caracteres (rota simples
// sem `tab` abre a aba Characters) e as abas Words/Phrases do Vocabulary.
const characterSections = ['Characters', 'Components', 'Radicals', 'Strokes'] as const;
const vocabularySections = [{ label: 'Words', tab: 'word' }, { label: 'Phrases', tab: 'phrase' }] as const;
import { LayoutGrid, BookOpen, Settings, Gamepad2, Library, ArrowUpRight, ChevronRight, X, Search, CircleHelp, ArrowRight, Sun, Moon, Maximize2, Minimize2, AudioLines, PanelLeftClose, PanelLeftOpen, MoreHorizontal } from 'lucide-react';
import { sectionIcons } from '@/lib/section-icons';
import { NAV_EXPANDED_KEY, NAV_PHONE_MAX, navModeFor, navSizeFor, phoneTabFor, readNavExpanded, type NavSize, type PhoneTab } from '@/lib/nav-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll } from '@/lib/site-search';
import { SearchHitContent } from './search-hit-content';
import { LibraryViewToggle } from './library-view-toggle';
// Main menu in three blocks: Start, then "Learn" (the reference sections) and
// "Practice" (Hanzi games and Pinyin games, each a main item with its games as
// sub-items, like Glyphs and Vocabulary). Full menu and drawer show each block's
// small uppercase heading; the icon strip draws it as a thin line.
// `key` is unique per item because Pinyin and Pinyin games share the /pinyin route
// (the Pinyin games item opens its first quiz mode through URL search `mode`).
// `games` marks a game family: its sub-items are that family's games, and it is
// the current item on any of those game pages.
type NavItem = { key: string; to: '/' | '/characters' | '/vocabulary' | '/pinyin' | '/flashcards'; search?: Record<string, string>; name: string; icon: GameIcon; games?: GameEntry[] };
const navSections: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ key: 'start', to: '/', name: 'Start', icon: LayoutGrid }] },
  { label: 'Learn', items: [{ key: 'glyphs', to: '/characters', name: 'Glyphs', icon: Library }, { key: 'vocabulary', to: '/vocabulary', name: 'Vocabulary', icon: BookOpen }, { key: 'pinyin', to: '/pinyin', name: 'Pinyin', icon: AudioLines }] },
  { label: 'Practice', items: [
    { key: 'hanzi-games', to: HANZI_GAMES[0]!.to, name: 'Hanzi games', icon: HanziIcon, games: HANZI_GAMES },
    { key: 'pinyin-games', to: PINYIN_GAMES[0]!.to, search: { mode: PINYIN_GAMES[0]!.mode! }, name: 'Pinyin games', icon: PinyinGamesIcon, games: PINYIN_GAMES },
  ] },
];
const navigation = navSections.flatMap(section => section.items);
// Settings lives in the menu's bottom row (beside the shrink/expand button, under
// the one divider), outside the scrolling list, so it is always reachable.
const settingsItem = { to: '/settings' as const, name: 'Settings', icon: Settings };
// Pinyin itself has no sub-items: it opens the Sound chart. Both game lists come
// from game-catalog so the Start page shows the same games.
// Pequeno ícone por secção da biblioteca/vocabulário: cada secção fica assim
// alcançável no trilho de ícones (sidebar colapsada), tal como os sub-itens de
// Game; na sidebar expandida continuam só de texto.
// Phone bottom tab bar: Start first, then the four main destinations (Vocabulary
// shortened to "Vocab" so it never clips); "More" (a button, not a link)
// opens the full menu drawer for Settings and every sub-item.
const phoneTabs: { key: Exclude<PhoneTab, 'more'>; to: '/' | '/characters' | '/vocabulary' | '/flashcards' | '/pinyin'; label: string; icon: GameIcon }[] = [
  { key: 'start', to: '/', label: 'Start', icon: LayoutGrid },
  { key: 'glyphs', to: '/characters', label: 'Glyphs', icon: Library },
  { key: 'vocabulary', to: '/vocabulary', label: 'Vocab', icon: BookOpen },
  { key: 'games', to: '/flashcards', label: 'Games', icon: Gamepad2 },
  { key: 'pinyin', to: '/pinyin', label: 'Pinyin', icon: AudioLines },
];
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
  // The breadcrumb (and phone title) names the exact page; inside a game, the game.
  const currentGame = [...HANZI_GAMES, ...PINYIN_GAMES].find(g => g.to === path && (g.mode === undefined || g.mode === activeMode));
  const current = currentGame?.label ?? [...navigation, settingsItem].find(n => n.to === path)?.name ?? (path === '/strokes' ? 'Practice' : 'Start');
  const navigate = useNavigate();
  // Menu per window size (see src/lib/nav-layout.ts): wide windows keep the menu
  // beside the page, full or as the slim icon strip (one remembered choice, no
  // hamburger); phones get the bottom tab bar whose "More" opens the drawer.
  // The phone layout itself is decided by CSS at the same 850px breakpoint, so
  // the first paint is right before this effect runs.
  const [navSize, setNavSize] = useState<NavSize>('wide');
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Icon strip: which main item's sub-item flyout is open (one at a time; nav-group.tsx).
  const [flyout, setFlyout] = useState<string | null>(null);
  useEffect(() => {
    setExpanded(readNavExpanded(window.localStorage));
    const phone = window.matchMedia(`(max-width: ${NAV_PHONE_MAX}px)`);
    const sync = () => { setNavSize(navSizeFor(window.innerWidth)); setMobileOpen(false); };
    sync();
    phone.addEventListener('change', sync);
    return () => phone.removeEventListener('change', sync);
  }, []);
  const navMode = navModeFor(navSize, expanded);
  const saveExpanded = (value: boolean) => {
    setExpanded(value);
    try { window.localStorage.setItem(NAV_EXPANDED_KEY, String(value)); } catch { /* storage unavailable: keep for this visit */ }
  };
  // Drawer focus: opening moves focus to the drawer's close button; closing hands
  // it back to "More", so keyboard and screen-reader users never lose their place.
  const moreRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (mobileOpen) drawerCloseRef.current?.focus();
    else if (wasOpen.current && navSize === 'phone') moreRef.current?.focus();
    wasOpen.current = mobileOpen;
  }, [mobileOpen, navSize]);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);
  const activePhoneTab = phoneTabFor(path, activeMode);
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
  return <div className={`workspace nav-${navMode}${navMode === 'rail' ? ' is-collapsed' : ''}${mobileOpen ? ' nav-expanded' : ''}`}>
    {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      {/* Logo row; on phones the drawer's close button sits at its right end. */}
      <div className="sidebar-head"><Link to="/" className="brand" aria-label="Mandarin Tutor home" title="Start" onClick={() => setMobileOpen(false)}><span className="brand-mark">语</span><span className="brand-copy"><strong>Mandarin<span className="brand-dot">.</span></strong><small>TUTOR / 一步一步</small></span></Link>
        <Button ref={drawerCloseRef} variant="ghost" size="icon" className="drawer-close close-x" aria-label="Close menu" title="Close menu" onClick={() => setMobileOpen(false)}><X/></Button></div>
      {/* Full menu and drawer: sub-items always visible, indented. Icon strip: main
          icons only, sub-items in a labelled flyout (nav-group.tsx). */}
      <nav aria-label="Main navigation">{navSections.map(section => <div key={section.label ?? 'start'} className="nav-section" role="group" aria-label={section.label ?? undefined}>
        {section.label && <span className="nav-section-label">{section.label}</span>}
        {section.items.map(n => {
        const subs: NavSub[] | null = n.to === '/characters' ? characterSections.map(k => ({ key: k, label: k, to: n.to, search: k === 'Characters' ? {} : { tab: k }, active: k === (charactersTab ?? 'Characters'), icon: sectionIcons[k], cls: 'nav-sub-tab' }))
          : n.to === '/vocabulary' ? vocabularySections.map(s => ({ key: s.label, label: s.label, to: n.to, search: s.tab === 'word' ? {} : { tab: s.tab }, active: s.tab === (vocabularyTab ?? 'word'), icon: sectionIcons[s.label], cls: 'nav-sub-tab' }))
          : n.games ? n.games.map(g => ({ key: g.key, label: g.label, to: g.to, search: g.mode ? { mode: g.mode } : undefined, active: currentGame?.key === g.key, icon: g.icon, cls: 'nav-sub-game' }))
          : null;
        // A game family owns its own game pages (Pinyin quiz modes light Pinyin
        // games); Pinyin owns only the Sound chart.
        const selected = n.games ? Boolean(currentGame && n.games.includes(currentGame)) : n.to === '/pinyin' ? path === '/pinyin' && !currentGame : path === n.to;
        return <NavGroup key={n.key} id={n.key} name={n.name} to={n.to} search={n.search} icon={n.icon} selected={selected} subs={subs} rail={navMode === 'rail'} onNavigate={() => setMobileOpen(false)} open={flyout === n.key} onOpenChange={open => setFlyout(current => open ? n.key : current === n.key ? null : current)}/>;
        })}</div>)}</nav>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row"><NavGroup id="settings" name={settingsItem.name} to={settingsItem.to} icon={settingsItem.icon} selected={path === settingsItem.to} subs={null} rail={navMode === 'rail'} onNavigate={() => setMobileOpen(false)} open={false} onOpenChange={() => setFlyout(null)}/>{navSize === 'wide' && (expanded
        // Full menu: shrink it to the slim icon strip (still beside the page).
        ? <Button size="icon" variant="ghost" className="sidebar-collapse" title="Shrink menu to icons" aria-label="Shrink menu to icons" onClick={() => saveExpanded(false)}><PanelLeftClose/></Button>
        // Icon strip: bring the names and sub-items back.
        : <Button size="icon" variant="ghost" className="sidebar-collapse" title="Show full menu" aria-label="Show full menu" onClick={() => saveExpanded(true)}><PanelLeftOpen/></Button>)}</div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/><span>{current}</span>{/* Phones show only this page title (serif) in place of the breadcrumb trail. */}<span className="topbar-title">{current}</span></div><div className="topbar-actions"><Button variant="ghost" className="search-trigger" title={`Search everything (${shortcut})`} aria-label={`Search everything (${shortcut})`} onClick={() => setSearching(true)}><Search/><span>Search</span><kbd>{shortcut}</kbd></Button><LibraryViewToggle/><span className="header-divider"/><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</Button><span className="header-divider"/><span className="learning-status"><span className="status-dot"/>One step at a time</span><Button asChild variant="ghost" className="avatar" title="Learning preferences"><Link to="/settings" aria-label="Learning preferences">学</Link></Button>{/* Phones: a plain Settings gear beside Search; theme, size and the 学 avatar live in Settings there. */}<Button asChild variant="ghost" size="icon" className="topbar-settings"><Link to="/settings" aria-label="Settings" title="Settings"><Settings/></Link></Button></div></header>
      <main className="main-content">{children}</main></div>
    {/* Phone bottom tab bar (hidden by CSS above 850px). */}
    <nav className="phone-tabs" aria-label="Quick navigation">{phoneTabs.map(t => <Link key={t.key} to={t.to} className={`phone-tab${activePhoneTab === t.key ? ' is-active' : ''}`} aria-current={activePhoneTab === t.key ? 'page' : undefined} onClick={() => setMobileOpen(false)}><t.icon/><span>{t.label}</span></Link>)}
      <button ref={moreRef} type="button" className={`phone-tab${activePhoneTab === 'more' || mobileOpen ? ' is-active' : ''}`} aria-expanded={mobileOpen} aria-label="More: open the full menu" title="Open the full menu" onClick={() => setMobileOpen(open => !open)}><MoreHorizontal/><span>More</span></button></nav>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>A character, its parts, then a little practice.</DialogDescription><div className="help-content"><p><strong>Study.</strong> Browse characters, radicals and components with sourced breakdowns and usage ranks. Apply filters together; × clears them.</p><p><strong>Practise.</strong> Write in Trace or Recall, or play the Hanzi games and Pinyin games.</p><p><strong>Pinyin.</strong> The Sound chart plays every syllable in each tone it has, recorded by a real speaker. Then test your ear with the Tone quiz, Sound-alikes and Type what you hear. Your progress is remembered in this browser.</p><p><strong>Vocabulary</strong> is a partial HSK 1–2 collection for now.</p><p>A dimmed speaker means your device voice is speaking. Preferences stay saved in this browser.</p><Button asChild onClick={() => setHelp(false)}><Link to="/characters">Explore characters <ArrowRight/></Link></Button></div></DialogContent></Dialog>
    <Dialog open={searching} onOpenChange={setSearching}><DialogContent className={`global-search${expandedSearch ? ' global-search-expanded' : ''}`}><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, components, and phrases.</DialogDescription><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); openHit(hits[0]); } }}/>{/* Same Pinyin/Exact toggles as the library search fields. */}
      <Button variant="ghost" type="button" className={`search-toggle${py === 'any' ? '' : ' on'}`} aria-pressed={py !== 'any'} title="Search pinyin only" onClick={() => setPy(py === 'any' ? 'pinyin' : 'any')}>Pinyin</Button>{py !== 'any' && <Button variant="ghost" type="button" className={`search-toggle${py === 'exact' ? ' on' : ''}`} aria-pressed={py === 'exact'} title="Match the exact pinyin reading only" onClick={() => setPy(py === 'exact' ? 'pinyin' : 'exact')}>Exact</Button>}</div>
      {query.trim() === '' ? <p className="global-search-hint">Start typing — results appear as you go. Press Enter to open the first one.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{hits.map(hit => <Button variant="ghost" type="button" key={hit.kind === 'Word' ? `w-${hit.word.id}` : `${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><SearchHitContent hit={hit}/></Button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
      {query.trim() !== '' && hits.length > 0 && <div className="global-search-foot"><span>{!expandedSearch && allHits.length > 50 ? `50 of ${allHits.length.toLocaleString()} matches` : `${allHits.length.toLocaleString()} ${allHits.length === 1 ? 'match' : 'matches'}`}</span><Button variant="ghost" type="button" aria-expanded={expandedSearch} onClick={() => setExpandedSearch(value => !value)}>{expandedSearch ? <Minimize2/> : <Maximize2/>}{expandedSearch ? 'Compact window' : 'Show all results'}</Button></div>}
    </DialogContent></Dialog>
  </div>;
}
