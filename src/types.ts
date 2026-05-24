export type FeedKind = 'rss' | 'google-alert';

export interface Feed {
  id: string;
  name: string;
  url: string;
  active: boolean;
  color: string;
  kind: FeedKind;
}

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  feedId: string;
  feedName: string;
  feedColor: string;
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
