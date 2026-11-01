import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useWorkspace } from './workspace';
// Seções indentadas na navegação: as da biblioteca de caracteres (rota simples
// sem `tab` abre a aba Characters) e as abas Words/Phrases do Vocabulary.
const characterSections = ['Characters', 'Radicals', 'Components', 'Strokes'] as const;
const vocabularySections = [{ label: 'Words', tab: 'word' }, { label: 'Phrases', tab: 'phrase' }] as const;
import { LayoutGrid, BookOpen, Settings, Layers, Library, PenLine, ArrowUpRight, ChevronsLeft, ChevronRight, Menu, X, Search, CircleHelp, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchAll } from '@/lib/site-search';
const navigation = [{ to: '/' as const, name: 'Start', icon: LayoutGrid }, { to: '/characters' as const, name: 'Glyphs', icon: Library }, { to: '/vocabulary' as const, name: 'Vocabulary', icon: BookOpen }, { to: '/flashcards' as const, name: 'Flashcards', icon: Layers }, { to: '/drawing' as const, name: 'Drawing game', icon: PenLine }, { to: '/settings' as const, name: 'Settings', icon: Settings }];
export function TutorShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  // Abas ativas de Glyphs e Vocabulary, para marcar o sub-item correspondente.
  const activeTab = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('tab') });
  const charactersTab = activeTab;
  const vocabularyTab = activeTab === 'phrase' ? 'phrase' : 'word';
  const current = navigation.find(n => n.to === path)?.name ?? (path === '/strokes' ? 'Practice' : 'Start');
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
      {/* Sub-itens sempre visíveis e indentados na navegação, para acesso direto
          de qualquer página; as abas na página continuam sendo a troca principal. */}
      <nav aria-label="Main navigation">{navigation.map(n => {
        const subs = n.to === '/characters' ? characterSections.map(k => ({ label: k, search: k === 'Characters' ? {} : { tab: k }, active: k === (charactersTab ?? 'Characters') }))
          : n.to === '/vocabulary' ? vocabularySections.map(s => ({ label: s.label, search: s.tab === 'word' ? {} : { tab: s.tab }, active: s.tab === (vocabularyTab ?? 'word') }))
          : null;
        return <div key={n.to}><Button asChild variant="ghost" className={`nav-item ${path === n.to ? 'is-active' : ''}`}><Link to={n.to} onClick={() => setMobileOpen(false)} title={n.name}><n.icon /><span>{n.name}</span>{path === n.to && <span className="active-dot" />}</Link></Button>{subs?.map(s => <Button asChild key={s.label} variant="ghost" className={`nav-sub-item ${path === n.to && s.active ? 'is-active' : ''}`}><Link to={n.to} search={s.search} onClick={() => setMobileOpen(false)} title={`Abrir ${s.label.toLowerCase()}`}><span>{s.label}</span></Link></Button>)}</div>;
      })}</nav>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row"><Button size="icon" variant="ghost" title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><ChevronsLeft className={collapsed ? 'rotate-180' : ''}/></Button></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</Button><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/><span>{current}</span></div><div className="topbar-actions"><Button variant="ghost" className="search-trigger" title={`Search everything (${shortcut})`} aria-label={`Search everything (${shortcut})`} onClick={() => setSearching(true)}><Search/><span>Search</span><kbd>{shortcut}</kbd></Button><span className="header-divider"/><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun/> : <Moon/>}</Button><div className="font-toggle" role="group" aria-label="Character style"><Button variant="ghost" type="button" className={preferences.font === 'Sans' ? 'active' : ''} data-font="sans" aria-pressed={preferences.font === 'Sans'} aria-label="Clean sans characters" title="Clean sans characters" onClick={() => setPreferences({ ...preferences, font: 'Sans' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Handwritten' ? 'active' : ''} data-font="handwritten" aria-pressed={preferences.font === 'Handwritten'} aria-label="Handwritten characters" title="Handwritten characters" onClick={() => setPreferences({ ...preferences, font: 'Handwritten' })}>永</Button><Button variant="ghost" type="button" className={preferences.font === 'Print' ? 'active' : ''} data-font="print" aria-pressed={preferences.font === 'Print'} aria-label="Print (song) characters" title="Print (song) characters" onClick={() => setPreferences({ ...preferences, font: 'Print' })}>永</Button></div><span className="header-divider"/><span className="learning-status"><span className="status-dot"/>One step at a time</span><Button asChild variant="ghost" className="avatar" title="Learning preferences"><Link to="/settings" aria-label="Learning preferences">学</Link></Button></div></header>
      <main className="main-content">{children}</main></div>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>A character, its parts, then a little practice.</DialogDescription><div className="help-content"><p><strong>Study the characters.</strong> Characters is the heart of this workspace — characters, radicals and components with near-complete material covering over 99% of everyday usage: frequency groups, sourced graphical breakdowns, and the characters each part appears in. Edit filters freely, then Apply them together; the × clears them and restores the full list.</p><p><strong>Make it stick.</strong> Practise writing in Watch, Trace or Recall mode, or print an A4 practice sheet. From any library's Play menu, start Flashcards or the Drawing game; missed items can be bookmarked for the session.</p><p><strong>Vocabulary is experimental.</strong> The Words tab holds HSK 3.0 words at Levels 1 and 2 plus unofficial Level 1 practice phrases — a partial collection for now, not full material. Official syllabus IDs appear only where recorded. Sentence characters link back to their own character records.</p><p>Audio uses an available recording first; a dimmed speaker means a supported Mandarin voice on your device is speaking instead. Use the Hide menu to cover translations, characters or pronunciation while you browse. Theme and reading preferences stay saved in this browser; saved words and additions last for the current session.</p><Button asChild onClick={() => setHelp(false)}><Link to="/characters">Explore characters <ArrowRight/></Link></Button></div></DialogContent></Dialog>
    <Dialog open={searching} onOpenChange={setSearching}><DialogContent className="global-search"><DialogTitle className="font-display text-xl">Search everything</DialogTitle><DialogDescription>Words, characters, radicals, and components.</DialogDescription><div className="search-field"><Search/><input autoFocus aria-label="Search everything" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); openHit(hits[0]); } }}/></div>
      {query.trim() === '' ? <p className="global-search-hint">Start typing — results appear as you go. Press Enter to open the first one.</p> : hits.length ? <div className="global-search-results" role="listbox" aria-label="Search results">{hits.map(hit => hit.kind === 'Word' ? <button type="button" key={`w-${hit.word.id}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><strong lang="zh-CN">{hit.word.hanzi}</strong><span className="pinyin">{hit.word.pinyin}</span><span className="hit-meaning" title={hit.word.meaning}>{hit.word.meaning}</span><span className="hit-kind">Word</span></button> : <button type="button" key={`${hit.kind}-${hit.hanzi}`} className="hero-search-hit" role="option" aria-selected={false} onClick={() => openHit(hit)}><strong lang="zh-CN">{hit.hanzi}</strong><span className="pinyin">{hit.pinyin}</span><span className="hit-meaning" title={hit.meaning}>{hit.meaning}</span><span className="hit-kind">{hit.kind}</span></button>)}</div> : <p className="hero-search-empty">No matches yet — try a character, pinyin, or English meaning.</p>}
      {query.trim() !== '' && <div className="global-search-foot"><span>{hits.length} {hits.length === 1 ? 'match' : 'matches'} shown</span><Button asChild variant="link" onClick={() => setSearching(false)}><Link to="/vocabulary" search={{ q: query }}>Search in vocabulary <ArrowRight/></Link></Button></div>}
    </DialogContent></Dialog>
  </div>;
}
