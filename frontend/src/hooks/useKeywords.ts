import { useState, useEffect, useCallback } from 'react';
import type { Keyword } from '../types';
import { dataStore } from '../data';

const STORAGE_KEY = 'news-keywords';

export function useKeywords() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataStore.load<Keyword[]>(STORAGE_KEY, []).then((stored) => {
      if (cancelled) return;
      setKeywords(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    dataStore.save(STORAGE_KEY, keywords);
  }, [keywords, loaded]);

  const addKeyword = useCallback((keyword: string, feedId: string | null) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setKeywords((prev) => {
      const isDuplicate = prev.some(
        (k) => k.feedId === feedId && k.keyword.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) return prev;
      return [{ id: crypto.randomUUID(), keyword: trimmed, feedId }, ...prev];
    });
  }, []);

  const removeKeyword = useCallback((id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }, []);

  return { keywords, addKeyword, removeKeyword };
}
