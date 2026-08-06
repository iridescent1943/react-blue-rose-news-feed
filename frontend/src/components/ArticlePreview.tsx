import { useEffect, useState } from 'react';
import type { Article } from '../types';

interface Props {
  article: Article | null;
  articleKey: string | null;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onMarkAsUnread: (articleKey: string) => void;
  onMarkAsRead: (articleKey: string) => void;
}

function PreviewActions({
  articleKey,
  bookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsUnread,
  onMarkAsRead,
}: {
  articleKey: string | null;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onMarkAsUnread: (articleKey: string) => void;
  onMarkAsRead: (articleKey: string) => void;
}) {
  const disabled = !articleKey;

  return (
    <div className="preview-actions-row">
      <button
        type="button"
        className={`preview-action-btn tooltip-anchor ${bookmarked ? 'active' : ''}`}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'Saved' : 'Save'}
        data-tooltip={bookmarked ? 'Saved' : 'Save'}
        disabled={disabled}
        onClick={() => articleKey && onToggleBookmark(articleKey)}
      >
        <svg
          className="preview-action-icon"
          viewBox="0 0 24 24"
          width="19"
          height="19"
          aria-hidden="true"
        >
          <path
            d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
            fill={bookmarked ? 'currentColor' : 'transparent'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className={`preview-action-btn tooltip-anchor ${isRead ? '' : 'active'}`}
        aria-pressed={!isRead}
        aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
        data-tooltip={isRead ? 'Mark as unread' : 'Mark as read'}
        disabled={disabled}
        onClick={() => articleKey && (isRead ? onMarkAsUnread(articleKey) : onMarkAsRead(articleKey))}
      >
        <svg
          className="preview-action-icon"
          viewBox="0 0 24 24"
          width="19"
          height="19"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="7"
            fill={isRead ? 'transparent' : 'currentColor'}
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractArticleText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('script, style, noscript, svg, iframe').forEach((node) => node.remove());

  const containers = [
    'article',
    'main',
    '[role="main"]',
    '.article-body',
    '.c-article-body',
    '.post-content',
    '.entry-content',
    '.content',
  ];

  function collectParagraphs(root: ParentNode): string[] {
    return Array.from(root.querySelectorAll('p'))
      .map((p) => p.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((text) => text.length >= 40);
  }

  let best: string[] = [];
  containers.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((node) => {
      const paragraphs = collectParagraphs(node);
      if (paragraphs.length > best.length) {
        best = paragraphs;
      }
    });
  });

  if (best.length === 0 && doc.body) {
    best = collectParagraphs(doc.body);
  }

  return best.join('\n\n').trim();
}

export function ArticlePreview({
  article,
  articleKey,
  bookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsUnread,
  onMarkAsRead,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [fullContent, setFullContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [article?.thumbnail, article?.link]);

  useEffect(() => {
    if (!article?.link) {
      setFullContent('');
      setContentLoading(false);
      return;
    }

    const controller = new AbortController();
    setContentLoading(true);
    setFullContent('');

    fetch(`/api/article-proxy?url=${encodeURIComponent(article.link)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((html) => {
        const extracted = extractArticleText(html);
        setFullContent(extracted);
      })
      .catch(() => {
        setFullContent('');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setContentLoading(false);
        }
      });

    return () => controller.abort();
  }, [article?.link]);

  if (!article) {
    return (
      <section className="preview-empty">
        <h3>Article Preview</h3>
        <p>Click an article in the list to view details here.</p>
      </section>
    );
  }

  const previewContent = fullContent || article.description;

  return (
    <section className="preview-content">
      <PreviewActions
        articleKey={articleKey}
        bookmarked={bookmarked}
        isRead={isRead}
        onToggleBookmark={onToggleBookmark}
        onMarkAsUnread={onMarkAsUnread}
        onMarkAsRead={onMarkAsRead}
      />
      <h2 className="preview-title">{article.title}</h2>
      <div className="preview-meta-row">
        <span className="preview-source">
          <svg className="preview-source-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <circle cx="5" cy="19" r="2" fill="currentColor" />
            <path d="M4 11a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M4 4a16 16 0 0 1 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          {article.feedName}
        </span>
        {article.pubDate && (
          <>
            <span className="preview-meta-sep" aria-hidden="true">·</span>
            <span className="preview-date">{formatDate(article.pubDate)}</span>
          </>
        )}
      </div>
      {article.thumbnail && !imageFailed ? (
        <img className="preview-image" src={article.thumbnail} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <div className="preview-image-placeholder" aria-hidden="true" />
      )}
      <p className="preview-desc">
        {contentLoading
          ? 'Loading full article content...'
          : previewContent || 'No content available for this article.'}
      </p>
      {article.link && (
        <a className="preview-link-btn" href={article.link} target="_blank" rel="noopener noreferrer">
          Open original article
        </a>
      )}
    </section>
  );
}
