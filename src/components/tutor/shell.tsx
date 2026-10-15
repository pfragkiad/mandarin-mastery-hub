import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useWorkspace } from './workspace';
import { LayoutGrid, BookOpen, PenLine, Library, Settings, Layers, Languages, ArrowUpRight, ChevronsLeft, ChevronRight, Menu, X, Sprout, Search, CircleHelp, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll } from '@/lib/site-search';
const navigation = [{ to: '/' as const, name: 'Overview', icon: LayoutGrid }, { to: '/vocabulary' as const, name: 'Vocabulary', icon: BookOpen }, { to: '/strokes' as const, name: 'Practice', icon: PenLine }, { to: '/characters' as const, name: 'Characters', icon: Languages }, { to: '/references' as const, name: 'References', icon: Library }, { to: '/flashcards' as const, name: 'Flashcards', icon: Layers }, { to: '/settings' as const, name: 'Settings', icon: Settings }];
export function TutorShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const current = navigation.find(n => n.to === path)?.name ?? 'Overview';
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [shortcut, setShortcut] = useState('Ctrl K');
  const { preferences, setPreferences, theme, setTheme, items } = useWorkspace();
  const hits = searchAll(items, query, preferences.includeTraditional);
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
    else navigate({ to: '/strokes', search: { character: hit.hanzi } });
  };
  return <div className={`workspace ${collapsed ? 'is-collapsed' : ''}`}>
    {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <Link to="/" className="brand" aria-label="Mandarin Tutor home"><span className="brand-mark">语</span><span className="brand-copy"><strong>Mandarin<span className="brand-dot">.</span></strong><small>TUTOR / 一步一步</small></span></Link>
      <div className="sidebar-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(n => <Button asChild variant="ghost" className={`nav-item ${path === n.to ? 'is-active' : ''}`} key={n.to}><Link to={n.to} onClick={() => setMobileOpen(false)} title={n.name}><n.icon /><span>{n.name}</span>{path === n.to && <span className="active-dot" />}</Link></Button>)}</nav>
      <div className="sidebar-note"><Sprout size={23} /><p>A little, every day.</p><span>一步一步，慢慢来。</span><div className="note-line" /></div>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row"><span>Made for curious minds</span><Button size="icon" variant="ghost" title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><ChevronsLeft className={collapsed ? 'rotate-180' : ''}/></Button></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</Button><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/><span>{current}</span></div><div className="topbar-actions"><Button variant="ghost" className="search-trigger" title={`Search everything (${shortcut})`} aria-label={`Search everything (${shortcut})`} onClick={() => setSearching(true)}><Search/><span>Search</span><kbd>{shortcut}</kbd></Button><span className="header-divider"/><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</Button><div className="font-toggle" role="group" aria-label="Character style"><Button variant="ghost" type="button" className={preferences.font === 'Sans' ? 'active' : ''} data-font="sans" aria-pressed={preferences.font === 'Sans'} aria-label="Clean sans characters" title="Clean sans characters" onClick={() => setPreferences({ ...preferences, font: 'Sans' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Handwritten' ? 'active' : ''} data-font="handwritten" aria-pressed={preferences.font === 'Handwritten'} aria-label="Handwritten characters" title="Handwritten characters" onClick={() => setPreferences({ ...preferences, font: 'Handwritten' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Print' ? 'active' : ''} data-font="print" aria-pressed={preferences.font === 'Print'} aria-label="Print (song) characters" title="Print (song) characters" onClick={() => setPreferences({ ...preferences, font: 'Print' })}>永</Button></div><span className="header-divider"/><span className="learning-status"><span className="status-dot"/>One step at a time</span><Button asChild variant="ghost" className="avatar" title="Learning preferences"><Link to="/settings" aria-label="Learning preferences">学</Link></Button></div></header>
      <main className="main-content">{children}</main><footer className="page-footer"><span>一步一步 <span className="footer-dot">·</span> One step at a time.</span><span>Mandarin Tutor</span></footer></div>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>Your Mandarin learning workspace</DialogDescription><div className="help-content"><p>Explore starter vocabulary, hear Mandarin pronunciation, and practice writing with animated stroke order.</p><p>This interface contains sample learning content. Bookmarks, new words, and preferences apply to your current session.</p><Button asChild onClick={() => setHelp(false)}><Link to="/vocabulary">Explore vocabulary <ArrowRight/></Link></Button></div></DialogContent></Dialog>
    <Dialog open={searching} onOpenChange={setSearching}><DialogContent className="global-search"><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, and components.</DialogDescription><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); openHit(hits[0]); } }}/></div>
      {query.trim() === '' ? <p className="global-search-hint">Start typing — results appear as you go. Press Enter to open the first one.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{hits.map(hit => hit.kind === 'Word' ? <button type="button" key={`w-${hit.word.id}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning" title={hit.word.meaning}>{hit.word.meaning}</span><span className="hit-kind">Word</span></button> : <button type="button" key={`${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning" title={hit.meaning}>{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
      {query.trim() !== '' && <div className="global-search-foot"><span>{hits.length} {hits.length === 1 ? 'match' : 'matches'} shown</span><Button asChild variant="link" onClick={() => setSearching(false)}><Link to="/vocabulary" search={{ q: query }}>Search in vocabulary <ArrowRight/></Link></Button></div>}
    </DialogContent></Dialog>
  </div>;
}
