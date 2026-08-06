import { useState } from 'react';
import type { Article } from '../types';

interface Props {
  article: Article;
  onSelect: () => void;
  selected: boolean;
  isRead: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onMarkAsUnread: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ArticleCard({
  article,
  onSelect,
  selected,
  isRead,
  bookmarked,
  onToggleBookmark,
  onMarkAsUnread,
}: Props) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [previewBookmarkState, setPreviewBookmarkState] = useState<boolean | null>(null);
  const showThumb = Boolean(article.thumbnail) && !thumbFailed;
  const effectiveBookmarked = previewBookmarkState ?? bookmarked;
  const cardClassName = `article-card ${selected ? 'selected' : ''} ${isRead ? 'read' : ''}`.trim();

  return (
    <article className={cardClassName} onClick={onSelect}>
      <div className="article-thumb-link">
        {showThumb ? (
          <img
            className="article-thumb"
            src={article.thumbnail}
            alt=""
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div className="article-thumb-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="article-body">
        <div className="article-head-row">
          <h3 className={`article-title ${isRead ? 'article-title-read' : ''}`}>
            {article.title}
          </h3>
          <div className="article-actions">
            <button
              type="button"
              className={`read-state-dot tooltip-anchor ${isRead ? 'read' : 'unread'}`}
              aria-label={isRead ? 'Mark article as unread' : 'New article'}
              data-tooltip={isRead ? 'Mark as unread' : 'New article'}
              onClick={(e) => {
                e.stopPropagation();
                if (isRead) {
                  onMarkAsUnread();
                }
              }}
            />
            <button
              type="button"
              className={`bookmark-btn tooltip-anchor ${effectiveBookmarked ? 'saved' : ''}`}
              aria-label={effectiveBookmarked ? 'Unsave' : 'Save'}
              aria-pressed={effectiveBookmarked}
              data-tooltip={effectiveBookmarked ? 'Unsave' : 'Save'}
              onMouseDown={(e) => {
                e.stopPropagation();
                setPreviewBookmarkState(!bookmarked);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                if (previewBookmarkState !== null) {
                  onToggleBookmark();
                }
                setPreviewBookmarkState(null);
              }}
              onMouseLeave={() => {
                setPreviewBookmarkState(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark();
                }
              }}
            >
              <svg
                className="bookmark-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                  fill={effectiveBookmarked ? 'currentColor' : 'transparent'}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="article-meta-stack">
          <span className="article-source">
            {article.feedName}
          </span>
          {article.pubDate && (
            <span className="article-date">{formatDate(article.pubDate)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
