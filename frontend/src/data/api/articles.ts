import type { Article, Feed } from '../../types';
import { apiRequest } from './http';

interface ArticleRow {
  article_id: number;
  feed_id: number;
  title: string;
  link: string;
  content_text: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  fetched_at: string;
  is_read: boolean | null;
  is_saved: boolean | null;
}

function mapArticle(row: ArticleRow, feedsById: Map<string, Feed>): Article {
  const feed = feedsById.get(String(row.feed_id));
  return {
    id: row.article_id,
    title: row.title,
    link: row.link,
    pubDate: row.published_at ?? row.fetched_at,
    description: row.content_text ?? '',
    thumbnail: row.thumbnail_url ?? undefined,
    feedId: String(row.feed_id),
    feedName: feed?.name ?? 'Unknown feed',
    feedColor: feed?.color ?? '#7b3f6e',
    isRead: row.is_read ?? false,
    isSaved: row.is_saved ?? false,
  };
}

export async function listArticles(feeds: Feed[]): Promise<Article[]> {
  const feedsById = new Map(feeds.map((f) => [f.id, f]));
  const rows = await apiRequest<ArticleRow[]>('/articles');
  return rows
    .filter((row) => feedsById.get(String(row.feed_id))?.active)
    .map((row) => mapArticle(row, feedsById));
}

export async function setArticleState(
  articleId: number,
  patch: { is_read?: boolean; is_saved?: boolean }
): Promise<void> {
  await apiRequest<void>(`/articles/${articleId}/state`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
