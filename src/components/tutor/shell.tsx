import { rememberOrigin } from '@/lib/practice-return';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from './workspace';
import { HanziIcon, HANZI_GAMES, PINYIN_GAMES, PinyinGamesIcon, type GameEntry, type GameIcon } from './game-catalog';
import { NavGroup, type NavSub } from './nav-group';
import { SectionPicker, type SectionOption } from './section-picker';
import { useSectionStats } from '@/lib/section-switch';
// Seções indentadas na navegação: as da biblioteca de caracteres (rota simples
// sem `tab` abre a aba Characters) e as abas Words/Phrases do Vocabulary.
const characterSections = ['Characters', 'Components', 'Radicals', 'Strokes'] as const;
const vocabularySections = [{ label: 'Words', tab: 'word' }, { label: 'Phrases', tab: 'phrase' }] as const;
import { LayoutGrid, BookOpen, Settings, Gamepad2, Library, ArrowUpRight, ChevronRight, X, Search, CircleHelp, ArrowRight, Sun, Moon, AudioLines, PanelLeftClose, PanelLeftOpen, MoreHorizontal } from 'lucide-react';
import { sectionIcons } from '@/lib/section-icons';
import { NAV_EXPANDED_KEY, NAV_PHONE_MAX, navModeFor, navSizeFor, phoneTabFor, readNavExpanded, type NavSize, type PhoneTab } from '@/lib/nav-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlobalSearch } from './global-search';
import { LibraryViewToggle } from './library-view-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// Main menu in three blocks: Start, then "Learn" (the reference sections) and
// "Games" (Hanzi and Pinyin, each a main item with its games as sub-items, like
// Glyphs and Vocabulary). The block is called "Games", not "Practice", so it never
// reads as the Hanzi writer's writing practice (/strokes); the families are
// named in full ("Hanzi games", "Pinyin games"). The reference
// item is named "Sound chart" (not "Pinyin") so only one menu item is called Pinyin.
// Full menu and drawer show each block's
// small uppercase heading; the icon strip draws it as a thin line.
// `games` marks a game family: its sub-items are that family's games, and it is
// the current item on any of those game pages.
type NavItem = { key: string; to: '/' | '/characters' | '/vocabulary' | GameEntry['to'] | '/pinyin'; name: string; icon: GameIcon; games?: GameEntry[] };
const navSections: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ key: 'start', to: '/', name: 'Start', icon: LayoutGrid }] },
  { label: 'Learn', items: [{ key: 'glyphs', to: '/characters', name: 'Glyphs', icon: Library }, { key: 'vocabulary', to: '/vocabulary', name: 'Vocabulary', icon: BookOpen }, { key: 'pinyin', to: '/pinyin', name: 'Sound chart', icon: AudioLines }] },
  { label: 'Games', items: [
    { key: 'hanzi-games', to: HANZI_GAMES[0]!.to, name: 'Hanzi games', icon: HanziIcon, games: HANZI_GAMES },
    { key: 'pinyin-games', to: PINYIN_GAMES[0]!.to, name: 'Pinyin games', icon: PinyinGamesIcon, games: PINYIN_GAMES },
  ] },
];
const navigation = navSections.flatMap(section => section.items);
// Preferences lives in the menu's bottom row (beside the shrink/expand button, under
// the one divider), outside the scrolling list, so it is always reachable.
const settingsItem = { to: '/preferences' as const, name: 'Preferences', icon: Settings };
// The Sound chart item has no sub-items: it opens the chart itself. Both game lists come
// from game-catalog so the Start page shows the same games.
// Pequeno ícone por secção da biblioteca/vocabulário: cada secção fica assim
// alcançável no trilho de ícones (sidebar colapsada), tal como os sub-itens de
// Game; na sidebar expandida continuam só de texto.
// Phone bottom tab bar: Start first, then the four main destinations under the
// side menu's own names (Vocabulary, Sound chart; tabs size to their labels in CSS
// so none clips; Games is the menu block name); "More" (a button, not a link)
// opens the full menu drawer for Preferences and every sub-item.
const phoneTabs: { key: Exclude<PhoneTab, 'more'>; to: '/' | '/characters' | '/vocabulary' | '/flashcards' | '/pinyin'; label: string; icon: GameIcon }[] = [
  { key: 'start', to: '/', label: 'Start', icon: LayoutGrid },
  { key: 'glyphs', to: '/characters', label: 'Glyphs', icon: Library },
  { key: 'vocabulary', to: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
  { key: 'games', to: '/flashcards', label: 'Games', icon: Gamepad2 },
  { key: 'pinyin', to: '/pinyin', label: 'Sound chart', icon: AudioLines },
];
export function TutorShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  // Track the page Practice's Back should return to (exact href incl. search).
  const fullHref = useRouterState({ select: s => s.location.href });
  rememberOrigin(path, fullHref);
  // Abas ativas de Glyphs e Vocabulary, para marcar o sub-item correspondente.
  const activeTab = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('tab') });
  const charactersTab = activeTab;
  const vocabularyTab = activeTab === 'phrase' ? 'phrase' : 'word';
  // O breadcrumb nomeia a página exata; dentro dos jogos, o nome do jogo.
  // The breadcrumb (and phone title) names the exact page; inside a game, the game.
  const currentGame = [...HANZI_GAMES, ...PINYIN_GAMES].find(g => g.to === path);
  const current = currentGame?.label ?? [...navigation, settingsItem].find(n => n.to === path)?.name ?? (path === '/strokes' ? 'Practice' : 'Start');
  // Header section switcher (section-picker.tsx): on Glyphs, Vocabulary and the five
  // games the breadcrumb's last step is a dropdown of that page's sections, built
  // here from the URL so its label is right on the first paint; the page only adds
  // counts (and the Pinyin quizzes a stop-audio hook) through section-switch.ts.
  // Glyphs keeps the All/Saved choice when switching kinds, as its old tabs did.
  const savedStatus = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('status') });
  const published = useSectionStats(path === '/characters' ? 'glyphs' : path === '/vocabulary' ? 'vocabulary' : currentGame ? 'games' : null);
  const allGames = [...HANZI_GAMES.map(g => ({ ...g, group: 'Hanzi games' })), ...PINYIN_GAMES.map(g => ({ ...g, group: 'Pinyin games' }))];
  const pageKey = path === '/characters' ? 'glyphs' : path === '/vocabulary' ? 'vocabulary' : path === '/pinyin' ? 'pinyin' : currentGame ? (HANZI_GAMES.includes(currentGame) ? 'hanzi-games' : 'pinyin-games') : null;
  const picker: { parent: string; phoneParent: string; options: SectionOption[]; active: string } | null =
    path === '/characters' ? { parent: 'Glyphs', phoneParent: 'Glyphs', active: published.active ?? (characterSections.find(k => k === charactersTab) ?? 'Characters'), options: characterSections.map(k => ({ key: k, label: k, icon: sectionIcons[k], to: '/characters', search: { ...(k === 'Characters' ? {} : { tab: k }), ...(savedStatus === 'saved' ? { status: 'saved' } : {}) } })) }
    : path === '/vocabulary' ? { parent: 'Vocabulary', phoneParent: 'Vocabulary', active: published.active ?? vocabularyTab, options: vocabularySections.map(v => ({ key: v.tab, label: v.label, icon: sectionIcons[v.label], to: '/vocabulary', search: { tab: v.tab } })) }
    : currentGame ? { parent: allGames.find(g => g.key === currentGame.key)!.group, phoneParent: 'Games', active: currentGame.key, options: allGames.map(g => ({ key: g.key, label: g.label, icon: g.icon, to: g.to, group: g.group })) }
    : null;
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
  const activePhoneTab = phoneTabFor(path);
  const [help, setHelp] = useState(false);
  const [searching, setSearching] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const { theme, setTheme } = useWorkspace();
  useEffect(() => { if (/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)) setShortcut('⌘K'); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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
          : n.games ? n.games.map(g => ({ key: g.key, label: g.label, to: g.to, active: currentGame?.key === g.key, icon: g.icon, cls: 'nav-sub-game' }))
          : null;
        // A game family owns its own game pages; the Sound chart owns /pinyin.
        const selected = n.games ? Boolean(currentGame && n.games.includes(currentGame)) : path === n.to;
        return <NavGroup key={n.key} id={n.key} name={n.name} to={n.to} icon={n.icon} selected={selected} subs={subs} rail={navMode === 'rail'} onNavigate={() => setMobileOpen(false)} open={flyout === n.key} onOpenChange={open => setFlyout(current => open ? n.key : current === n.key ? null : current)}/>;
        })}</div>)}</nav>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row"><NavGroup id="settings" name={settingsItem.name} to={settingsItem.to} icon={settingsItem.icon} selected={path === settingsItem.to} subs={null} rail={navMode === 'rail'} onNavigate={() => setMobileOpen(false)} open={false} onOpenChange={() => setFlyout(null)}/>{navSize === 'wide' && (expanded
        // Full menu: shrink it to the slim icon strip (still beside the page).
        ? <Button size="icon" variant="ghost" className="sidebar-collapse" title="Shrink menu to icons" aria-label="Shrink menu to icons" onClick={() => saveExpanded(false)}><PanelLeftClose/></Button>
        // Icon strip: bring the names and sub-items back.
        : <Button size="icon" variant="ghost" className="sidebar-collapse" title="Show full menu" aria-label="Show full menu" onClick={() => saveExpanded(true)}><PanelLeftOpen/></Button>)}</div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className={`breadcrumbs${pageKey ? ' has-picker' : ''}`}><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/>{pageKey
        // Wider windows: the trail is read-only plain text (My workspace › Glyphs ›
        // Components) — navigation lives in the side menu. Phones swap the page step
        // for the plain serif title (the bottom tab bar already switches pages there;
        // games say "Games", as the tab does) and keep the section dropdown as a pill.
        ? <><span className="breadcrumb-page">{picker?.parent ?? current}</span><span className="topbar-title">{picker?.phoneParent ?? current}</span>
          {picker && <><ChevronRight size={14} className="crumb-sep"/><span className="breadcrumb-section">{picker.options.find(o => o.key === picker.active)?.label ?? picker.active}</span><SectionPicker page={picker.parent} options={picker.options} active={picker.active} stats={published.stats} beforeSwitch={published.beforeSwitch}/></>}</>
        : <><span>{current}</span>{/* Phones show only this page title (serif) in place of the breadcrumb trail. */}<span className="topbar-title">{current}</span></>}</div><div className="topbar-actions"><Button variant="ghost" className="search-trigger" title={`Search everything (${shortcut})`} aria-label={`Search everything (${shortcut})`} onClick={() => setSearching(true)}><Search/><span>Search</span><kbd>{shortcut}</kbd></Button>{/* Preferences gear: phones only (hidden by CSS above 850px, where the menu's bottom row covers it). */}<Button asChild variant="ghost" size="icon" className="prefs-link" title="Preferences" aria-label="Preferences"><Link to="/preferences"><Settings/></Link></Button><LibraryViewToggle/><span className="header-divider"/><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</Button><span className="header-divider"/>{/* Account avatar: a placeholder for now. Its menu opens greyed out, so the
        spot is real without promising an account that doesn't exist yet. */}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="avatar" aria-label="Account" title="Account"><span aria-hidden="true">学</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled>Account — coming soon</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>
      <main className="main-content">{children}</main></div>
    {/* Phone bottom tab bar (hidden by CSS above 850px). */}
    <nav className="phone-tabs" aria-label="Quick navigation">{phoneTabs.map(t => <Link key={t.key} to={t.to} className={`phone-tab${activePhoneTab === t.key ? ' is-active' : ''}`} aria-current={activePhoneTab === t.key ? 'page' : undefined} onClick={() => setMobileOpen(false)}><t.icon/><span>{t.label}</span></Link>)}
      <button ref={moreRef} type="button" className={`phone-tab${activePhoneTab === 'more' || mobileOpen ? ' is-active' : ''}`} aria-expanded={mobileOpen} aria-label="More: open the full menu" title="Open the full menu" onClick={() => setMobileOpen(open => !open)}><MoreHorizontal/><span>More</span></button></nav>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>A character, its parts, then a little practice.</DialogDescription><div className="help-content"><p><strong>Study.</strong> Browse characters, radicals and components with sourced breakdowns and usage ranks. Apply filters together; × clears them.</p><p><strong>Practise.</strong> Write in Trace or Recall, or play the Hanzi games and Pinyin games.</p><p><strong>Pinyin.</strong> The Sound chart plays every syllable in each tone it has, recorded by a real speaker. Then test your ear with the Tone quiz, Sound-alikes and Type what you hear. Your progress is remembered in this browser.</p><p><strong>Vocabulary</strong> is a partial HSK 1–2 collection for now.</p><p>A dimmed speaker means your device voice is speaking. Preferences stay saved in this browser.</p><Button asChild onClick={() => setHelp(false)}><Link to="/characters">Explore characters <ArrowRight/></Link></Button></div></DialogContent></Dialog>
    {/* Search lives in its own component so typing never rerenders the menu or page. */}
    <GlobalSearch open={searching} onOpenChange={setSearching}/>
  </div>;
}
