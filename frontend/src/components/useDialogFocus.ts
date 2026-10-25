import { useEffect, useRef } from 'react';
export function useDialogFocus(open: boolean, close: () => void, disabled = false) {
  const latest = useRef({ close, disabled });
  latest.current = { close, disabled };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('.modal[role="dialog"]');
    dialog?.querySelector<HTMLElement>('button, input, select, textarea, a')?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && !latest.current.disabled) latest.current.close();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a, input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? []);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length-1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length-1]) { event.preventDefault(); focusable[0].focus(); }
    }
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [open]);
}
