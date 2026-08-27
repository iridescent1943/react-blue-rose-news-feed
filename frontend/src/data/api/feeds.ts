import type { Feed, FeedKind } from '../../types';
import { apiRequest } from './http';

const FEED_COLORS = [
  '#7b3f6e', '#4a2040', '#9b5a8a', '#c084b0',
  '#5c3d6b', '#a0527a', '#3d1f4f', '#b87ba0',
];

interface FeedRow {
  feed_id: number;
  source_type: 'rss' | 'google_alert';
  feed_url: string;
  title: string | null;
  status: 'active' | 'paused' | 'error';
}

function mapFeed(row: FeedRow): Feed {
  return {
    id: String(row.feed_id),
    name: row.title || row.feed_url,
    url: row.feed_url,
    active: row.status === 'active',
    color: FEED_COLORS[row.feed_id % FEED_COLORS.length],
    kind: row.source_type === 'google_alert' ? 'google-alert' : 'rss',
  };
}

export async function listFeeds(): Promise<Feed[]> {
  const rows = await apiRequest<FeedRow[]>('/feeds?limit=100');
  return rows.map(mapFeed);
}

export async function createFeed(name: string, url: string, kind: FeedKind): Promise<Feed> {
  const row = await apiRequest<FeedRow>('/feeds', {
    method: 'POST',
    body: JSON.stringify({
      feed_url: url,
      title: name,
      source_type: kind === 'google-alert' ? 'google_alert' : 'rss',
    }),
  });
  return mapFeed(row);
}

export async function removeFeed(id: string): Promise<void> {
  await apiRequest<void>(`/feeds/${id}`, { method: 'DELETE' });
}

export async function setFeedActive(id: string, active: boolean): Promise<Feed> {
  const row = await apiRequest<FeedRow>(`/feeds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: active ? 'active' : 'paused' }),
  });
  return mapFeed(row);
}
