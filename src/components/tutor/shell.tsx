import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { LayoutGrid, BookOpen, PenLine, Library, Settings, Layers, ArrowUpRight, ChevronsLeft, ChevronRight, Menu, X, Sprout, Search, CircleHelp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
const navigation = [{ to: '/' as const, name: 'Overview', icon: LayoutGrid }, { to: '/vocabulary' as const, name: 'Vocabulary', icon: BookOpen }, { to: '/strokes' as const, name: 'Strokes', icon: PenLine }, { to: '/characters' as const, name: 'Characters', icon: Languages }, { to: '/references' as const, name: 'References', icon: Library }, { to: '/flashcards' as const, name: 'Flashcards', icon: Layers }, { to: '/settings' as const, name: 'Settings', icon: Settings }];
export function TutorShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const current = navigation.find(n => n.to === path)?.name ?? 'Overview';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [help, setHelp] = useState(false);
  return <div className={`workspace ${collapsed ? 'is-collapsed' : ''}`}>
    {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <Link to="/" className="brand" aria-label="Mandarin Tutor home"><span className="brand-mark">语</span><span className="brand-copy"><strong>Mandarin<span className="brand-dot">.</span></strong><small>TUTOR / 一步一步</small></span></Link>
      <div className="sidebar-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(n => <Button asChild variant="ghost" className={`nav-item ${path === n.to ? 'is-active' : ''}`} key={n.to}><Link to={n.to} onClick={() => setMobileOpen(false)} title={n.name}><n.icon /><span>{n.name}</span>{path === n.to && <span className="active-dot" />}</Link></Button>)}</nav>
      <div className="sidebar-note"><Sprout size={23} /><p>A little, every day.</p><span>一步一步，慢慢来。</span><div className="note-line" /></div>
      <div className="sidebar-bottom"><Button variant="ghost" onClick={() => setHelp(true)} className="help-link" title="About this workspace"><CircleHelp /><span>A little guidance</span><ArrowUpRight size={14}/></Button><div className="sidebar-bottom-row"><span>Made for curious minds</span><Button size="icon" variant="ghost" title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><ChevronsLeft className={collapsed ? 'rotate-180' : ''}/></Button></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</Button><span className="breadcrumb-home">My workspace</span><ChevronRight size={14}/><span>{current}</span></div><div className="topbar-actions"><Button asChild variant="ghost" size="icon" title="Search vocabulary"><Link to="/vocabulary" aria-label="Search vocabulary"><Search/></Link></Button><span className="header-divider"/><span className="learning-status"><span className="status-dot"/>One step at a time</span><Button asChild variant="ghost" className="avatar" title="Learning preferences"><Link to="/settings" aria-label="Learning preferences">学</Link></Button></div></header>
      <main className="main-content">{children}</main><footer className="page-footer"><span>一步一步 <span className="footer-dot">·</span> One step at a time.</span><span>Mandarin Tutor</span></footer></div>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle className="font-display text-2xl">A little guidance</DialogTitle><DialogDescription>Your Mandarin learning workspace</DialogDescription><div className="help-content"><p>Explore starter vocabulary, hear Mandarin pronunciation, and practice writing with animated stroke order.</p><p>This interface contains sample learning content. Bookmarks, new words, and preferences apply to your current session.</p><Button asChild onClick={() => setHelp(false)}><Link to="/vocabulary">Explore vocabulary <ArrowRight/></Link></Button></div></DialogContent></Dialog>
  </div>;
}
