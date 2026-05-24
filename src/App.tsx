import { useEffect, useRef, useState } from 'react';
import { useFeeds } from './hooks/useFeeds';
import { useArticles } from './hooks/useArticles';
import { ThemePanel } from './components/ThemePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ArticleList } from './components/ArticleList';
import { ArticlePreview } from './components/ArticlePreview';
import type { Article } from './types';
import './App.css';

function getArticleKey(article: { feedId: string; link: string; pubDate: string }): string {
  return `${article.feedId}::${article.link}::${article.pubDate}`;
}

export default function App() {
  const { feeds, addFeed, removeFeed, toggleFeed } = useFeeds();
  const { articles, loading, errors } = useArticles(feeds);
  const [selectedArticleKey, setSelectedArticleKey] = useState<string | null>(null);
  const [selectedTemplateArticle, setSelectedTemplateArticle] = useState<Article | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('news-layout-split-ratio');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 35 && parsed <= 65 ? parsed : 50;
  });
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('news-left-panel-width');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 240 && parsed <= 460 ? parsed : 320;
  });
  const [paletteIndex, setPaletteIndex] = useState<number>(() => {
    const saved = localStorage.getItem('news-theme-palette-index');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5 ? parsed : 0;
  });
  const contentLayoutRef = useRef<HTMLDivElement | null>(null);
  const appBodyRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const draggingLeftRef = useRef(false);

  const activeCount = feeds.filter((f) => f.active).length;
  const selectedArticle = selectedArticleKey
    ? articles.find((a) => getArticleKey(a) === selectedArticleKey) ?? null
    : null;
  const previewArticle = selectedArticle ?? selectedTemplateArticle;

  useEffect(() => {
    if (articles.length === 0) {
      setSelectedArticleKey(null);
      return;
    }

    if (selectedTemplateArticle) {
      setSelectedTemplateArticle(null);
    }

    if (!selectedArticleKey) {
      setSelectedArticleKey(getArticleKey(articles[0]));
      return;
    }

    const stillExists = articles.some((a) => getArticleKey(a) === selectedArticleKey);
    if (!stillExists) {
      setSelectedArticleKey(getArticleKey(articles[0]));
    }
  }, [articles, selectedArticleKey, selectedTemplateArticle]);

  function handleSelectArticleKey(articleKey: string) {
    setSelectedTemplateArticle(null);
    setSelectedArticleKey(articleKey);
  }

  function handleSplitChange(value: number) {
    setSplitRatio(value);
    localStorage.setItem('news-layout-split-ratio', String(value));
  }

  function handlePaletteSelect(index: number) {
    setPaletteIndex(index);
    localStorage.setItem('news-theme-palette-index', String(index));
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (draggingRef.current && contentLayoutRef.current) {
        const rect = contentLayoutRef.current.getBoundingClientRect();
        const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(35, Math.min(65, rawPercent));
        handleSplitChange(Number(clamped.toFixed(1)));
      }

      if (draggingLeftRef.current && appBodyRef.current) {
        const rect = appBodyRef.current.getBoundingClientRect();
        const rawWidth = e.clientX - rect.left;
        const clamped = Math.max(240, Math.min(460, rawWidth));
        setLeftPanelWidth(clamped);
        localStorage.setItem('news-left-panel-width', String(clamped));
      }
    }

    function onMouseUp() {
      const wasDragging = draggingRef.current || draggingLeftRef.current;
      draggingRef.current = false;
      draggingLeftRef.current = false;
      if (wasDragging) {
        document.body.classList.remove('is-resizing-layout');
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function beginResize() {
    draggingRef.current = true;
    document.body.classList.add('is-resizing-layout');
  }

  function beginLeftResize() {
    draggingLeftRef.current = true;
    document.body.classList.add('is-resizing-layout');
  }

  function handleDividerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = e.key === 'ArrowLeft' ? splitRatio - 2 : splitRatio + 2;
    const clamped = Math.max(35, Math.min(65, next));
    handleSplitChange(clamped);
  }

  return (
    <div className={`app theme-${paletteIndex}`}>
      <header className="app-header">
        <span className="app-header-brand">Blue is the Rarest Color in Nature</span>
        <SettingsPanel
          feeds={feeds}
          errors={errors}
          onToggle={toggleFeed}
          onRemove={removeFeed}
          onAdd={addFeed}
        />
      </header>

      <div className="app-body" ref={appBodyRef}>
        <ThemePanel
          width={leftPanelWidth}
          activePalette={paletteIndex}
          onPaletteSelect={handlePaletteSelect}
        />
        <div
          className="side-divider"
          role="separator"
          aria-label="Resize left panel"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={beginLeftResize}
        />
        <main className="main-content">
          <div className="content-layout" ref={contentLayoutRef} style={{ '--split-ratio': `${splitRatio}%` } as React.CSSProperties}>
            <section className="list-panel">
              <ArticleList
                articles={articles}
                loading={loading}
                activeCount={activeCount}
                onSelect={handleSelectArticleKey}
                selectedKey={selectedArticleKey}
                onSelectTemplate={setSelectedTemplateArticle}
              />
            </section>
            <div
              className="content-divider"
              role="separator"
              aria-label="Resize article list and preview"
              aria-orientation="vertical"
              tabIndex={0}
              onMouseDown={beginResize}
              onKeyDown={handleDividerKeyDown}
            />
            <aside className="preview-panel">
              <ArticlePreview article={previewArticle} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

