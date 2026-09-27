import { useEffect, useState } from 'react';

// Returns `value`, but only updates after it's stopped changing for
// `delayMs` — used to make "search as you type" feel instant to the user
// while not firing a network request on every single keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
