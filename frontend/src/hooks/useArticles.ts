import { useState, useEffect } from 'react';
import type { Feed, Article, Rss2JsonResponse } from '../types';
import { listArticles } from '../data/api/articles';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';
const DEV_RSS_PROXY_API = '/api/rss-proxy?url=';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function getNodeText(parent: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const node = parent.querySelector(selector);
    if (node?.textContent?.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

function getRssLink(item: Element): string {
  const linkNode = item.querySelector('link');
  if (!linkNode) return '';

  const href = linkNode.getAttribute('href');
  if (href) return href.trim();

  const rdfResource = linkNode.getAttribute('rdf:resource');
  if (rdfResource) return rdfResource.trim();

  return (linkNode.textContent ?? '').trim();
}

function getThumbnailUrl(item: Element): string | undefined {
  const mediaThumb = item.querySelector('media\\:thumbnail, thumbnail');
  const mediaContent = item.querySelector('media\\:content, content');
  const enclosure = item.querySelector('enclosure');

  const fromThumb = mediaThumb?.getAttribute('url');
  if (fromThumb) return fromThumb;

  const fromContent = mediaContent?.getAttribute('url');
  if (fromContent) return fromContent;

  const fromEnclosure = enclosure?.getAttribute('url');
  if (fromEnclosure) return fromEnclosure;

  return undefined;
}

function parseXmlFeed(feed: Feed, xml: string): Article[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML feed format');
  }

  const rssItems = Array.from(doc.querySelectorAll('channel > item'));
  const rdfItems = Array.from(doc.querySelectorAll('rdf\\:RDF > item, RDF > item, item'));
  const atomEntries = Array.from(doc.querySelectorAll('feed > entry, entry'));

  const dedupe = new Set<Element>();
  const orderedItems = [...rssItems, ...rdfItems, ...atomEntries].filter((node) => {
    if (dedupe.has(node)) return false;
    dedupe.add(node);
    return true;
  });

  const nodes = orderedItems;

  if (nodes.length === 0) {
    throw new Error('No RSS items or Atom entries found');
  }

  return nodes.slice(0, 20).map((item, i) => {
    const title = getNodeText(item, ['title']) || `Untitled article ${i + 1}`;
    const link = getRssLink(item);
    const pubDate =
      getNodeText(item, [
        'pubDate',
        'dc\\:date',
        'prism\\:publicationDate',
        'published',
        'updated',
        'date',
      ]) || new Date().toISOString();
    const description = stripHtml(
      getNodeText(item, [
        'description',
        'summary',
        'content',
        'content\\:encoded',
        'dc\\:description',
      ])
    );

    return {
      title,
      link,
      pubDate,
      description,
      thumbnail: getThumbnailUrl(item),
      feedId: feed.id,
      feedName: feed.name,
      feedColor: feed.color,
    };
  });
}

async function fetchFeedViaRss2Json(feed: Feed): Promise<Article[]> {
  const url = `${RSS2JSON_API}?rss_url=${encodeURIComponent(feed.url)}&count=20`;
  const res = await fetch(url);
  let errorMessage = `HTTP ${res.status}`;

  if (!res.ok) {
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) {
        errorMessage = `HTTP ${res.status}: ${body.message}`;
      }
    } catch {
      // Keep default HTTP message if body is not JSON.
    }
    throw new Error(errorMessage);
  }

  const data: Rss2JsonResponse = await res.json();
  if (data.status !== 'ok') {
    throw new Error('Feed error from rss2json');
  }

  return data.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: stripHtml(item.description),
    thumbnail: item.thumbnail || item.enclosure?.link,
    feedId: feed.id,
    feedName: feed.name,
    feedColor: feed.color,
  }));
}

async function fetchFeedViaDevProxy(feed: Feed): Promise<Article[]> {
  const url = `${DEV_RSS_PROXY_API}${encodeURIComponent(feed.url)}`;
  const res = await fetch(url);
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status} via dev proxy`;
    if (res.status === 404) {
      errorMessage = 'Dev RSS proxy not available. Restart the dev server to load vite.config changes.';
    }
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) {
        errorMessage = `${errorMessage}: ${body.error}`;
      }
    } catch {
      // Keep generic message when response is not JSON.
    }
    throw new Error(errorMessage);
  }

  const xml = await res.text();
  const articles = parseXmlFeed(feed, xml);
  if (articles.length === 0) {
    throw new Error('No articles found in feed');
  }

  return articles;
}

async function fetchFeed(feed: Feed): Promise<Article[]> {
  try {
    return await fetchFeedViaDevProxy(feed);
  } catch (devProxyError) {
    const devProxyMessage = devProxyError instanceof Error ? devProxyError.message : 'dev proxy failed';
    let isNatureFeed = false;
    try {
      isNatureFeed = /(^|\.)nature\.com$/i.test(new URL(feed.url).hostname);
    } catch {
      isNatureFeed = false;
    }

    // If proxy route is unavailable, preserve the actionable restart guidance and stop here.
    if (devProxyMessage.includes('Dev RSS proxy not available')) {
      throw new Error(devProxyMessage);
    }

    // DNS resolution failures are definitive in local dev; do not keep retrying other providers.
    if (devProxyMessage.includes('ENOTFOUND') || devProxyMessage.includes('EAI_AGAIN')) {
      throw new Error(devProxyMessage);
    }

    // rss2json currently returns 422 for Nature feeds, so skip that fallback for nature.com.
    if (isNatureFeed) {
      throw new Error(devProxyMessage);
    }

    try {
      return await fetchFeedViaRss2Json(feed);
    } catch (rss2jsonError) {
      const second = rss2jsonError instanceof Error ? rss2jsonError.message : 'rss2json failed';
      throw new Error(`${devProxyMessage}; second fallback failed: ${second}`);
    }
  }
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

    if (IS_API_MODE) {
      listArticles(feeds)
        .then((result) => {
          if (cancelled) return;
          setArticles(result);
        })
        .catch((err) => {
          if (cancelled) return;
          setErrors({ _global: err instanceof Error ? err.message : 'Failed to load articles' });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

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
