import { useState } from 'react';
import { CheckCircle2, Check, ListTree, MoreHorizontal, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FaceView } from '@/lib/face-view';
import { CharacterHintsToggle, FaceToggles } from './face-toggles';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

/**
 * Lesson study controls (the designer's sidebar + phone proposal), shared by lesson-page.tsx.
 *
 * Wide layout — the sidebar is three blocks (CSS: .lesson-toc is a fixed-height flex column):
 *   SidebarProgress (pinned top): "N of M tasks done", bar, and a small ⋯ menu holding the
 *     destructive actions — "Reset this section" (the section in view) and "Reset whole
 *     lesson…". The whole-lesson choice turns the card into an inline confirm ("Reset all M
 *     tasks?" Cancel / Reset) instead of opening a modal, so Reset is never one tap away.
 *   the section list (scrolls on its own), and
 *   StudyToggles + Character hints (pinned bottom): one row of Hanzi / Pinyin / EN toggles.
 * Narrow layout (the page's own width, the lesson page's existing layout condition):
 *   PhoneLessonBar — one sticky strip (section in view, Sections and Settings buttons, bar,
 *   "2/15"); the buttons open bottom sheets (the app's tab bar keeps the screen bottom); Settings ends with a red
 *   "Reset progress…" row that opens a centred confirm.
 * Every reset is reported by the page with an Undo toast (the page snapshots first).
 * Inputs only; the one local state here is which sheet/confirm is open.
 */

export type StudyView = FaceView;
export type SectionLink = { id: string; title: string; done: number; total: number; complete: boolean };
export type ProgressNumbers = { done: number; total: number; fraction: number; state: 'not-started' | 'in-progress' | 'done' };

/** Hanzi / Pinyin / EN as one row of on/off toggles ("on" = shown) — the shared FaceToggles in
 *  the grids' toolbar look (owner: same style as the grid in Compact and Comfortable). */
export function StudyToggles({ view, onChange }: { view: StudyView; onChange: (next: StudyView) => void }) {
  return <FaceToggles view={view} onChange={onChange} label="Show in the lesson" size="toolbar"/>;
}

/** Sidebar progress card with the ⋯ reset menu and the inline whole-lesson confirm. */
export function SidebarProgress({ numbers, section, onResetSection, onResetLesson }: { numbers: ProgressNumbers; section: { title: string; done: number } | null; onResetSection: () => void; onResetLesson: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const { done, total, fraction, state } = numbers;
  if (confirming) return <div className="lesson-toc-progress is-confirming" role="group" aria-label="Confirm reset">
    <p className="lesson-confirm-title">Reset all {total} {total === 1 ? 'task' : 'tasks'}?</p>
    <p className="lesson-confirm-copy">This clears your answers and progress for this lesson.</p>
    <div className="lesson-confirm-actions">
      <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)} autoFocus>Cancel</Button>
      <Button type="button" size="sm" className="lesson-reset-confirm" onClick={() => { setConfirming(false); onResetLesson(); }}>Reset</Button>
    </div>
  </div>;
  return <div className={`lesson-toc-progress is-${state}`}>
    <div className="lesson-toc-progress-head">
      <span className="eyebrow">YOUR PROGRESS</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" className="lesson-progress-menu" aria-label="Progress options"><MoreHorizontal aria-hidden="true"/></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="lesson-progress-menu-list">
          <DropdownMenuItem disabled={!section || section.done === 0} onSelect={onResetSection}><RotateCcw aria-hidden="true"/>{section ? <>Reset “{section.title}”</> : 'Reset this section'}</DropdownMenuItem>
          <DropdownMenuSeparator/>
          <DropdownMenuItem disabled={state === 'not-started' && done === 0} className="is-destructive" onSelect={() => setConfirming(true)}><RotateCcw aria-hidden="true"/>Reset whole lesson…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <span className="lesson-progress-label">{state === 'done' ? <><CheckCircle2 aria-hidden="true"/>Completed</> : `${done} of ${total} ${total === 1 ? 'task' : 'tasks'} done`}</span>
    <ProgressTrack fraction={fraction}/>
  </div>;
}

function ProgressTrack({ fraction }: { fraction: number }) {
  return <span className="lesson-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}><span style={{ width: `${fraction * 100}%` }}/></span>;
}

/** Narrow layout: the sticky progress strip with Sections / Settings and their bottom sheets. */
export function PhoneLessonBar({ numbers, activeTitle, sections, activeId, onJump, view, onView, hints, onHints, onResetLesson, section, onResetSection }: {
  numbers: ProgressNumbers; activeTitle: string; sections: SectionLink[]; activeId: string | null; onJump: (id: string) => void;
  view: StudyView; onView: (next: StudyView) => void; hints: boolean; onHints: (on: boolean) => void; onResetLesson: () => void;
  /** The section in view (its title and completed task count), for "Reset this section"; null when it has no tasks. */
  section: { title: string; done: number } | null; onResetSection: () => void;
}) {
  const [sheet, setSheet] = useState<'sections' | 'settings' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const { done, total, fraction, state } = numbers;
  const count = state === 'done' ? <Check aria-label="Completed"/> : `${done}/${total}`;
  return <>
    {/* One sticky strip (owner's choice): the app's own tab bar keeps the bottom of the screen. */}
    <div className="lesson-phone-strip">
      <div className="lesson-phone-strip-top">
        <span className="lesson-phone-strip-title">{activeTitle}</span>
        <div className="lesson-phone-strip-tools" role="toolbar" aria-label="Lesson controls">
          <button type="button" onClick={() => setSheet('sections')}><ListTree aria-hidden="true"/>Sections</button>
          <button type="button" onClick={() => setSheet('settings')}><Settings2 aria-hidden="true"/>Settings</button>
        </div>
      </div>
      <span className="lesson-phone-strip-row"><ProgressTrack fraction={fraction}/><span className="lesson-phone-strip-count">{count}</span></span>
    </div>
    <Drawer open={sheet === 'sections'} onOpenChange={o => setSheet(o ? 'sections' : null)} shouldScaleBackground={false}>
      <DrawerContent className="lesson-sheet">
        <DrawerHeader className="lesson-sheet-head"><DrawerTitle>In this lesson</DrawerTitle><DrawerDescription className="sr-only">Jump to a part of the lesson</DrawerDescription></DrawerHeader>
        <nav className="lesson-sheet-sections" aria-label="Lesson sections">
          {sections.map(s => <button key={s.id} type="button" aria-current={activeId === s.id ? 'true' : undefined} onClick={() => { setSheet(null); onJump(s.id); }}>
            <span>{s.title}</span>
            {s.total > 0 && <span className={`lesson-toc-count${s.complete ? ' is-done' : ''}`}>{s.complete ? <Check aria-label="Done"/> : `${s.done}/${s.total}`}</span>}
          </button>)}
        </nav>
      </DrawerContent>
    </Drawer>
    <Drawer open={sheet === 'settings'} onOpenChange={o => setSheet(o ? 'settings' : null)} shouldScaleBackground={false}>
      <DrawerContent className="lesson-sheet">
        <DrawerHeader className="lesson-sheet-head"><DrawerTitle>Settings</DrawerTitle><DrawerDescription className="sr-only">What the lesson shows, and your progress</DrawerDescription></DrawerHeader>
        <div className="lesson-sheet-group">
          <p className="lesson-sheet-caption">Show</p>
          <div className="lesson-sheet-row is-faces"><FaceToggles view={view} onChange={onView} label="Show in the lesson" size="toolbar"/></div>
          <CharacterHintsToggle checked={hints} onChange={onHints} size="sheet"/>
        </div>
        <div className="lesson-sheet-group">
          <p className="lesson-sheet-caption">Progress · {state === 'done' ? 'completed' : `${done} of ${total} done`}</p>
          {/* Owner's choice: the section in view can be reset on its own too (Undo toast, no confirm, as on the desktop menu). */}
          <button type="button" className="lesson-sheet-row is-destructive" disabled={!section || section.done === 0} onClick={() => { setSheet(null); onResetSection(); }}><span><RotateCcw aria-hidden="true"/>{section ? `Reset “${section.title}”` : 'Reset this section'}</span></button>
          <button type="button" className="lesson-sheet-row is-destructive" disabled={done === 0 && state !== 'done'} onClick={() => { setSheet(null); setConfirm(true); }}><span><RotateCcw aria-hidden="true"/>Reset progress…</span></button>
        </div>
      </DrawerContent>
    </Drawer>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Reset all {total} {total === 1 ? 'task' : 'tasks'}?</AlertDialogTitle><AlertDialogDescription>This clears your answers and progress for this lesson.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="lesson-reset-confirm" onClick={onResetLesson}>Reset</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

