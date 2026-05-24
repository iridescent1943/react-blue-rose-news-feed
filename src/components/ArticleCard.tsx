import type { Article } from '../types';

interface Props {
  article: Article;
  onSelect: () => void;
  selected: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ArticleCard({ article, onSelect, selected }: Props) {
  return (
    <article className={`article-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      {article.thumbnail && (
        <div className="article-thumb-link">
          <img
            className="article-thumb"
            src={article.thumbnail}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="article-body">
        <div className="article-meta">
          <span className="article-source" style={{ color: article.feedColor }}>
            {article.feedName}
          </span>
          {article.pubDate && (
            <span className="article-date">{formatDate(article.pubDate)}</span>
          )}
        </div>
        <h3 className="article-title">
          {article.title}
        </h3>
        {article.description && (
          <p className="article-desc">{article.description}</p>
        )}
      </div>
    </article>
  );
}
