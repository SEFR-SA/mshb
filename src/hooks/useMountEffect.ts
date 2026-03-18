import { useEffect } from 'react';

/**
 * Custom hook to handle one-time external synchronization on mount.
 * Banning direct useEffect usage forces predictable, declarative logic.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(effect, []);
}
