import type { Article } from '../types';

interface Props {
  article: Article | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ArticlePreview({ article }: Props) {
  if (!article) {
    return (
      <section className="preview-empty">
        <h3>Article Preview</h3>
        <p>Click an article in the list to view details here.</p>
      </section>
    );
  }

  return (
    <section className="preview-content">
      <div className="preview-meta">
        <span className="preview-source" style={{ color: article.feedColor }}>{article.feedName}</span>
        {article.pubDate && <span className="preview-date">{formatDate(article.pubDate)}</span>}
      </div>
      <h2 className="preview-title">{article.title}</h2>
      {article.thumbnail && (
        <img className="preview-image" src={article.thumbnail} alt="" />
      )}
      <p className="preview-desc">
        {article.description || 'No description available for this article.'}
      </p>
      {article.link && (
        <a className="preview-link" href={article.link} target="_blank" rel="noopener noreferrer">
          Open original article
        </a>
      )}
    </section>
  );
}
