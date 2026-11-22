import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

/**
 * A "Reset progress" button that asks first, shared by the lesson page (one lesson) and the
 * Lessons index (a whole course). Inputs: the button `label`, the dialog `title`/`description`
 * naming exactly what will be cleared, and `onReset`, run only after the learner confirms.
 * No state of its own: the dialog's open state is Radix's, so an accidental click clears nothing.
 */
export function ResetProgressButton({ label, title, description, onReset, className }: { label: string; title: string; description: string; onReset: () => void; className?: string }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button type="button" size="sm" variant="outline" className={`lesson-reset${className ? ` ${className}` : ''}`}><RotateCcw aria-hidden="true"/>{label}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onReset}>Reset</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
