import { useMemo, useState } from 'react';
import type { Article } from '../types';
import { ArticleCard } from './ArticleCard';

interface Props {
  articles: Article[];
  loading: boolean;
  activeCount: number;
  onSelect: (articleKey: string) => void;
  selectedKey: string | null;
  bookmarkedKeys: string[];
  readKeys: string[];
  onToggleBookmark: (articleKey: string) => void;
  onToggleReadState: (articleKey: string) => void;
}

function getArticleKey(article: { id?: number; feedId: string; link: string; pubDate: string }): string {
  return article.id !== undefined ? String(article.id) : `${article.feedId}::${article.link}::${article.pubDate}`;
}

export function ArticleList({
  articles,
  loading,
  activeCount,
  onSelect,
  selectedKey,
  bookmarkedKeys,
  readKeys,
  onToggleBookmark,
  onToggleReadState,
}: Props) {
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedTime, setSelectedTime] = useState<'all' | 'today' | 'days7' | 'days30'>('all');
  const [selectedSection, setSelectedSection] = useState<'all' | 'saved'>('all');

  const sourceOptions = useMemo(() => {
    const countsBySource = new Map<string, number>();

    articles.forEach((article) => {
      const articleKey = getArticleKey(article);
      if (!readKeys.includes(articleKey)) {
        countsBySource.set(article.feedName, (countsBySource.get(article.feedName) ?? 0) + 1);
      }
    });

    const sourceEntries = Array.from(new Set(articles.map((article) => article.feedName)))
      .sort((a, b) => a.localeCompare(b))
      .map((source) => ({
        value: source,
        label: `${source} (${countsBySource.get(source) ?? 0})`,
      }));

    return [
      { value: 'all', label: 'All Sources' },
      ...sourceEntries,
    ];
  }, [articles, readKeys]);

  const effectiveSelectedSource =
    selectedSource !== 'all' && !sourceOptions.some((option) => option.value === selectedSource)
      ? 'all'
      : selectedSource;

  const filteredArticles =
    effectiveSelectedSource === 'all'
      ? articles
      : articles.filter((article) => article.feedName === effectiveSelectedSource);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 6);

  const last30Start = new Date(todayStart);
  last30Start.setDate(last30Start.getDate() - 29);

  const withinTimeFilter = (article: Article) => {
    if (selectedTime === 'all') return true;

    const publishedAt = new Date(article.pubDate);
    if (isNaN(publishedAt.getTime())) return false;

    if (selectedTime === 'today') {
      return publishedAt >= todayStart;
    }

    if (selectedTime === 'days7') {
      return publishedAt >= last7Start;
    }

    return publishedAt >= last30Start;
  };

  const totalUnread = articles.filter((article) => !readKeys.includes(getArticleKey(article))).length;

  const allEntries = filteredArticles
    .filter(withinTimeFilter)
    .map((article) => ({ article, articleKey: getArticleKey(article) }));

  const savedEntries = articles
    .filter(withinTimeFilter)
    .map((article) => ({ article, articleKey: getArticleKey(article) }))
    .filter((entry) => bookmarkedKeys.includes(entry.articleKey));

  const visibleEntries = selectedSection === 'saved' ? savedEntries : allEntries;

  let listContent;
  if (activeCount === 0) {
    listContent = (
      <div className="empty-state article-filter-empty">
        No active feeds.
        <br />
        Add a source or enable a feed in Settings to see articles here.
      </div>
    );
  } else if (loading) {
    listContent = (
      <div className="loading-state loading-state-inline">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    );
  } else if (articles.length === 0) {
    listContent = (
      <div className="empty-state article-filter-empty">
        No articles loaded yet.
        <br />
        Add or enable a valid RSS feed in Settings.
      </div>
    );
  } else if (visibleEntries.length === 0) {
    listContent = (
      <div className="empty-state article-filter-empty">
        {selectedSection === 'saved'
          ? 'No saved articles yet.'
          : 'No articles for the selected source.'}
      </div>
    );
  } else {
    listContent = visibleEntries.map(({ article, articleKey }) => (
      <ArticleCard
        key={articleKey}
        article={article}
        onSelect={() => onSelect(articleKey)}
        selected={selectedKey === articleKey}
        isRead={readKeys.includes(articleKey)}
        bookmarked={bookmarkedKeys.includes(articleKey)}
        onToggleBookmark={() => onToggleBookmark(articleKey)}
        onToggleReadState={() => onToggleReadState(articleKey)}
      />
    ));
  }

  return (
    <div className="article-list-wrap">
      <div className="article-filter-bar">
        <select
          id="article-source-filter"
          className="article-filter-select"
          aria-label="Filter articles by source"
          value={effectiveSelectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          id="article-time-filter"
          className="article-filter-select article-filter-select-time"
          aria-label="Filter articles by time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value as 'all' | 'today' | 'days7' | 'days30')}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="days7">Last 7 days</option>
          <option value="days30">Last 30 days</option>
        </select>
        <div className="article-section-switch" aria-label="Article sections">
          <button
            type="button"
            aria-pressed={selectedSection === 'all'}
            className={`article-section-btn ${selectedSection === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSection('all')}
          >
            Feeds ({totalUnread})
          </button>
          <button
            type="button"
            aria-pressed={selectedSection === 'saved'}
            className={`article-section-btn ${selectedSection === 'saved' ? 'active' : ''}`}
            onClick={() => setSelectedSection('saved')}
          >
            Saved ({savedEntries.length})
          </button>
        </div>
      </div>

      <div className="article-list">
        {listContent}
      </div>
    </div>
  );
}
