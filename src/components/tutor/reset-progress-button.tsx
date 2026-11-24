import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

/**
 * A "Reset progress" button that asks first, shared by the lesson page (one lesson) and the
 * Lessons index (a whole course). Inputs: the button `label`, the dialog `title`/`description`
 * naming exactly what will be cleared, `onReset`, run only after the learner confirms, and
 * `disabled` (shown but inert while there is nothing to clear) and `look`: 'button' (outline,
 * default) or 'link' (a quiet text link, for the lesson's "Start over").
 * No state of its own: the dialog's open state is Radix's, so an accidental click clears nothing.
 */
export function ResetProgressButton({ label, title, description, onReset, className, disabled, look = 'button' }: { label: string; title: string; description: string; onReset: () => void; className?: string; disabled?: boolean; look?: 'button' | 'link' }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild>{look === 'link'
      ? <button type="button" disabled={disabled} className={`lesson-reset-link${className ? ` ${className}` : ''}`}>{label}</button>
      : <Button type="button" size="sm" disabled={disabled} variant="outline" className={`lesson-reset${className ? ` ${className}` : ''}`}><RotateCcw aria-hidden="true"/>{label}</Button>}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="lesson-reset-confirm" onClick={onReset}>Reset</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
