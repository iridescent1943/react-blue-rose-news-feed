import type { Article, Keyword } from '../types';

export function filterArticlesByKeywords(articles: Article[], keywords: Keyword[]): Article[] {
  if (keywords.length === 0) return articles;

  return articles.filter((article) => {
    const relevant = keywords.filter((k) => k.feedId === null || k.feedId === article.feedId);
    if (relevant.length === 0) return false;

    const haystack = `${article.title} ${article.description}`.toLowerCase();
    return relevant.some((k) => haystack.includes(k.keyword.toLowerCase()));
  });
}
