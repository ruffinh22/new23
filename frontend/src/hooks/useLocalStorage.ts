/**
 * useLocalStorage Hook
 * Hook pour gérer le localStorage de manière réactive
 */

import { useState, useCallback } from 'react';

interface UseLocalStorageResult<T> {
  value: T | null;
  setValue: (value: T) => void;
  removeValue: () => void;
}

export const useLocalStorage = <T,>(key: string, initialValue?: T): UseLocalStorageResult<T> => {
  const [value, setValueState] = useState<T | null>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue || null;
    } catch {
      console.warn(`Error reading localStorage key \"${key}\":`, Error);
      return initialValue || null;
    }
  });

  const setValue = useCallback(
    (newValue: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setValueState(newValue);
      } catch {
        console.warn(`Error setting localStorage key \"${key}\":`, Error);
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setValueState(null);
    } catch {
      console.warn(`Error removing localStorage key \"${key}\":`, Error);
    }
  }, [key]);

  return { value, setValue, removeValue };
};
