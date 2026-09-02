import { useState, useEffect, useCallback } from 'react';
import type { Feed, FeedKind } from '../types';
import { dataStore } from '../data';
import { listFeeds, createFeed, removeFeed as apiRemoveFeed, setFeedActive } from '../data/api/feeds';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';
const STORAGE_KEY = 'news-feeds';

const FEED_COLORS = [
  '#7b3f6e', '#4a2040', '#9b5a8a', '#c084b0',
  '#5c3d6b', '#a0527a', '#3d1f4f', '#b87ba0',
];

const NATURE_PLANTS_FEED_URL = 'https://www.nature.com/nplants.rss';

const DEFAULT_FEEDS: Feed[] = [
  {
    id: crypto.randomUUID(),
    name: 'The English Garden',
    url: 'https://www.theenglishgarden.co.uk/rss.xml',
    active: true,
    color: FEED_COLORS[0],
    kind: 'rss',
  },
  {
    id: crypto.randomUUID(),
    name: 'Nature Plants',
    url: NATURE_PLANTS_FEED_URL,
    active: true,
    color: FEED_COLORS[1],
    kind: 'rss',
  },
  {
    id: crypto.randomUUID(),
    name: 'Google Alert — blue rose',
    url: '',
    active: false,
    color: FEED_COLORS[2],
    kind: 'google-alert',
  },
];

function nextColor(feeds: Feed[]): string {
  const used = new Set(feeds.map((f) => f.color));
  return FEED_COLORS.find((c) => !used.has(c)) ?? FEED_COLORS[feeds.length % FEED_COLORS.length];
}

function migrateFeeds(input: Feed[]): Feed[] {
  const migratedFeeds = input.map((feed) => {
    if (feed.url === 'https://www.theenglishgarden.co.uk/feed/') {
      return { ...feed, url: 'https://www.theenglishgarden.co.uk/rss.xml' };
    }

    if (feed.url === 'https://floristrytoday.com/feed/') {
      return {
        ...feed,
        active: false,
        name: feed.name.includes('(offline)') ? feed.name : `${feed.name} (offline)`,
      };
    }

    if (feed.url.includes('nature.com/') && feed.name.includes('(disabled)')) {
      return {
        ...feed,
        active: true,
        name: feed.name.replace(' (disabled)', ''),
      };
    }

    return feed;
  });

  const hasNaturePlants = migratedFeeds.some((feed) => feed.url === NATURE_PLANTS_FEED_URL);
  if (!hasNaturePlants) {
    migratedFeeds.push({
      id: crypto.randomUUID(),
      name: 'Nature Plants',
      url: NATURE_PLANTS_FEED_URL,
      active: true,
      color: nextColor(migratedFeeds),
      kind: 'rss',
    });
  }

  return migratedFeeds;
}

export function useFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = IS_API_MODE
      ? listFeeds()
      : dataStore.load<Feed[]>(STORAGE_KEY, DEFAULT_FEEDS).then(migrateFeeds);
    load.then((result) => {
      if (cancelled) return;
      setFeeds(result);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || IS_API_MODE) return;
    dataStore.save(STORAGE_KEY, feeds);
  }, [feeds, loaded]);

  const addFeed = useCallback((name: string, url: string, kind: FeedKind) => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (IS_API_MODE) {
      createFeed(trimmedName, trimmedUrl, kind).then((feed) => {
        setFeeds((prev) => [...prev, feed]);
      });
      return;
    }

    setFeeds((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        url: trimmedUrl,
        active: true,
        color: nextColor(prev),
        kind,
      },
    ]);
  }, []);

  const removeFeed = useCallback((id: string) => {
    if (IS_API_MODE) {
      apiRemoveFeed(id).then(() => {
        setFeeds((prev) => prev.filter((f) => f.id !== id));
      });
      return;
    }
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const toggleFeed = useCallback((id: string) => {
    if (IS_API_MODE) {
      const current = feeds.find((f) => f.id === id);
      if (!current) return;
      setFeedActive(id, !current.active).then((updated) => {
        setFeeds((prev) => prev.map((f) => (f.id === id ? updated : f)));
      });
      return;
    }
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  }, [feeds]);

  return { feeds, addFeed, removeFeed, toggleFeed, loaded };
}
