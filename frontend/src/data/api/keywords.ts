import type { Keyword } from '../../types';
import { apiRequest } from './http';

interface KeywordRow {
  keyword_id: number;
  feed_id: number | null;
  keyword: string;
}

function mapKeyword(row: KeywordRow): Keyword {
  return {
    id: String(row.keyword_id),
    keyword: row.keyword,
    feedId: row.feed_id === null ? null : String(row.feed_id),
  };
}

export async function listKeywords(): Promise<Keyword[]> {
  const rows = await apiRequest<KeywordRow[]>('/keywords');
  return rows.map(mapKeyword);
}

export async function createKeyword(keyword: string, feedId: string | null): Promise<Keyword> {
  const row = await apiRequest<KeywordRow>('/keywords', {
    method: 'POST',
    body: JSON.stringify({ keyword, feed_id: feedId }),
  });
  return mapKeyword(row);
}

export async function removeKeyword(id: string): Promise<void> {
  await apiRequest<void>(`/keywords/${id}`, { method: 'DELETE' });
}
