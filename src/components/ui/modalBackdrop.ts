import type { MouseEvent } from 'react';

// Attach to the outer backdrop div's onClick. Only fires when the click
// landed on the backdrop itself, not something inside the modal box (no
// stopPropagation needed on the inner content — a click inside naturally
// has e.target !== e.currentTarget).
export function backdropClickHandler(onClose: () => void) {
  return (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
}
