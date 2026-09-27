import { useEffect } from 'react';

// Call with the modal's open state and close handler. Only listens while
// open. Pair with a backdrop element using onMouseDown={onBackdropClick}
// (see components/ui/modalBackdrop.ts) for the matching click-outside
// behavior — Escape and click-outside are handled separately since they're
// different event types, but both just call the same onClose.
export function useEscapeKey(onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClose]);
}
