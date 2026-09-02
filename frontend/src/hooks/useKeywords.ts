import { useState, useEffect, useCallback } from 'react';
import type { Keyword } from '../types';
import { dataStore } from '../data';
import { listKeywords, createKeyword, removeKeyword as apiRemoveKeyword } from '../data/api/keywords';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';
const STORAGE_KEY = 'news-keywords';

export function useKeywords() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = IS_API_MODE ? listKeywords() : dataStore.load<Keyword[]>(STORAGE_KEY, []);
    load.then((stored) => {
      if (cancelled) return;
      setKeywords(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || IS_API_MODE) return;
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

      if (IS_API_MODE) {
        createKeyword(trimmed, feedId).then((created) => {
          setKeywords((current) => [created, ...current]);
        });
        return prev;
      }

      return [{ id: crypto.randomUUID(), keyword: trimmed, feedId }, ...prev];
    });
  }, []);

  const removeKeyword = useCallback((id: string) => {
    if (IS_API_MODE) {
      apiRemoveKeyword(id).then(() => {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
      });
      return;
    }
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }, []);

  return { keywords, addKeyword, removeKeyword, loaded };
}
