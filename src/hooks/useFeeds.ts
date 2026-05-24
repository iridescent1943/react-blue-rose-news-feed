import { useState, useEffect, useCallback } from 'react';
import type { Feed, FeedKind } from '../types';

const STORAGE_KEY = 'news-feeds';

const FEED_COLORS = [
  '#7b3f6e', '#4a2040', '#9b5a8a', '#c084b0',
  '#5c3d6b', '#a0527a', '#3d1f4f', '#b87ba0',
];

const DEFAULT_FEEDS: Feed[] = [
  {
    id: crypto.randomUUID(),
    name: 'Florist Review',
    url: 'https://floristrytoday.com/feed/',
    active: true,
    color: FEED_COLORS[0],
    kind: 'rss',
  },
  {
    id: crypto.randomUUID(),
    name: 'The English Garden',
    url: 'https://www.theenglishgarden.co.uk/feed/',
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

export function useFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Feed[]) : DEFAULT_FEEDS;
    } catch {
      return DEFAULT_FEEDS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
  }, [feeds]);

  const addFeed = useCallback((name: string, url: string, kind: FeedKind) => {
    setFeeds((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        url: url.trim(),
        active: true,
        color: nextColor(prev),
        kind,
      },
    ]);
  }, []);

  const removeFeed = useCallback((id: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const toggleFeed = useCallback((id: string) => {
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  }, []);

  return { feeds, addFeed, removeFeed, toggleFeed };}
