import { useContext } from 'react';
import { UnseenContext } from '../context/UnseenContext';

export function useUnseen() {
  const ctx = useContext(UnseenContext);
  if (!ctx) throw new Error('useUnseen must be used within an UnseenProvider');
  return ctx;
}
