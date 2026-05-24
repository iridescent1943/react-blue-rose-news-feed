import { useState, useEffect } from 'react';
import type { Feed, Article, Rss2JsonResponse } from '../types';

const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

async function fetchFeed(feed: Feed): Promise<Article[]> {
  const url = `${RSS2JSON_API}?rss_url=${encodeURIComponent(feed.url)}&count=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: Rss2JsonResponse = await res.json();
  if (data.status !== 'ok') throw new Error('Feed error');
  return data.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: stripHtml(item.description).slice(0, 200),
    thumbnail: item.thumbnail || item.enclosure?.link,
    feedId: feed.id,
    feedName: feed.name,
    feedColor: feed.color,
  }));
}

export function useArticles(feeds: Feed[]) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const activeFeeds = feeds.filter((f) => f.active);
    if (activeFeeds.length === 0) {
      setArticles([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrors({});

    Promise.allSettled(activeFeeds.map((f) => fetchFeed(f))).then((results) => {
      if (cancelled) return;
      const newErrors: Record<string, string> = {};
      const allArticles: Article[] = [];

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          allArticles.push(...result.value);
        } else {
          newErrors[activeFeeds[i].id] = result.reason?.message ?? 'Failed to load';
        }
      });

      allArticles.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );

      setArticles(allArticles);
      setErrors(newErrors);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [feeds]);

  return { articles, loading, errors };
}
