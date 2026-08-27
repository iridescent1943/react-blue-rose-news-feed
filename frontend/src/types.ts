export type FeedKind = 'rss' | 'google-alert';

export interface Feed {
  id: string;
  name: string;
  url: string;
  active: boolean;
  color: string;
  kind: FeedKind;
}

export interface Keyword {
  id: string;
  keyword: string;
  /** Feed this keyword filters; null applies to all feeds. */
  feedId: string | null;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export interface Article {
  /** Only set in API mode — the backend's article_id, needed for state/notes calls. */
  id?: number;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  feedId: string;
  feedName: string;
  feedColor: string;
  /** Only set in API mode — read/saved state, sourced from Postgres. */
  isRead?: boolean;
  isSaved?: boolean;
}

export interface Rss2JsonResponse {
  status: string;
  feed: {
    title: string;
    url: string;
    image: string;
  };
  items: Rss2JsonItem[];
}

export interface Rss2JsonItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  enclosure?: { link: string };
}
