import { useEffect, useState } from 'react';
import type { Article } from '../types';

interface Props {
  article: Article | null;
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

export function ArticlePreview({ article }: Props) {
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
      <div className="preview-source-row">
        <span className="preview-source">{article.feedName}</span>
      </div>
      <h2 className="preview-title">{article.title}</h2>
      {article.pubDate && <span className="preview-date">{formatDate(article.pubDate)}</span>}
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
        <a className="preview-link" href={article.link} target="_blank" rel="noopener noreferrer">
          Open original article
        </a>
      )}
    </section>
  );
}
