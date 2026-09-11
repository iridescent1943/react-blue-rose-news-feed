import { useEffect, useRef, useState } from 'react';
import { useFeeds } from './hooks/useFeeds';
import { useArticles } from './hooks/useArticles';
import { useKeywords } from './hooks/useKeywords';
import { useAdminAuth } from './hooks/useAdminAuth';
import { ThemePanel } from './components/ThemePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ArticleList } from './components/ArticleList';
import { ArticlePreview } from './components/ArticlePreview';
import { dataStore } from './data';
import { filterArticlesByKeywords } from './utils/filterArticles';
import { setArticleState } from './data/api/articles';
import { listNotesForArticle, createNote, updateNote as apiUpdateNote, deleteNote as apiDeleteNote } from './data/api/notes';
import type { Note } from './types';
import './App.css';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';
const BOOKMARKS_STORAGE_KEY = 'news-bookmarked-article-keys';
const READ_STORAGE_KEY = 'news-read-article-keys';
const NOTES_STORAGE_KEY = 'news-article-notes';

function getArticleKey(article: { id?: number; feedId: string; link: string; pubDate: string }): string {
  return article.id !== undefined ? String(article.id) : `${article.feedId}::${article.link}::${article.pubDate}`;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isNote(value: unknown): value is Note {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Note).id === 'string' &&
    typeof (value as Note).text === 'string' &&
    typeof (value as Note).createdAt === 'string'
  );
}

function asNotesRecord(value: unknown): Record<string, Note[]> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, Note[]> = {};
  for (const [key, notes] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(notes)) {
      result[key] = notes.filter(isNote);
    }
  }
  return result;
}

function getInitialLeftPanelWidth(): number {
  const saved = localStorage.getItem('news-left-panel-width');
  const parsed = saved ? Number(saved) : NaN;
  const fallback = typeof window === 'undefined'
    ? 320
    : Math.max(220, Math.min(420, Math.round(window.innerWidth * 0.3)));
  return Number.isFinite(parsed) && parsed >= 220 && parsed <= 420 ? parsed : fallback;
}

export default function App() {
  const { feeds, addFeed, removeFeed, toggleFeed, loaded: feedsLoaded } = useFeeds();
  const { keywords, addKeyword, removeKeyword, loaded: keywordsLoaded } = useKeywords();
  const { articles: fetchedArticles, loading, errors } = useArticles(feeds);
  const [articleStateOverrides, setArticleStateOverrides] = useState<Record<number, { isRead?: boolean; isSaved?: boolean }>>({});
  const articlesWithOverrides = IS_API_MODE
    ? fetchedArticles.map((a) => (a.id !== undefined && articleStateOverrides[a.id] ? { ...a, ...articleStateOverrides[a.id] } : a))
    : fetchedArticles;
  const articles = IS_API_MODE ? articlesWithOverrides : filterArticlesByKeywords(fetchedArticles, keywords);
  const [selectedArticleKey, setSelectedArticleKey] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('news-layout-split-ratio');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 35 && parsed <= 65 ? parsed : 50;
  });
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => getInitialLeftPanelWidth());
  const [paletteIndex, setPaletteIndex] = useState<number>(() => {
    const saved = localStorage.getItem('news-theme-palette-index');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 5;
  });
  const contentLayoutRef = useRef<HTMLDivElement | null>(null);
  const appBodyRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const draggingLeftRef = useRef(false);

  const [bookmarkedKeys, setBookmarkedKeys] = useState<string[]>([]);
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [readStateLoaded, setReadStateLoaded] = useState(IS_API_MODE);
  const [notesByArticle, setNotesByArticle] = useState<Record<string, Note[]>>({});
  const [notesLoaded, setNotesLoaded] = useState(IS_API_MODE);
  const [previewNotes, setPreviewNotes] = useState<Note[]>([]);
  const { authenticated, login, logout, sessionChecked } = useAdminAuth();
  const [authPrompt, setAuthPrompt] = useState<{ reason: string; action: () => void } | null>(null);
  const [guestToastExpired, setGuestToastExpired] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  useEffect(() => {
    if (!showLogoutToast) return;
    const timer = setTimeout(() => setShowLogoutToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showLogoutToast]);

  useEffect(() => {
    if (!IS_API_MODE || !sessionChecked || authenticated || guestToastExpired) return;
    const timer = setTimeout(() => setGuestToastExpired(true), 5000);
    return () => clearTimeout(timer);
  }, [sessionChecked, authenticated, guestToastExpired]);

  const showGuestToast = IS_API_MODE && sessionChecked && !authenticated && !guestToastExpired;

  function withAuth(reason: string, action: () => void) {
    if (!IS_API_MODE || authenticated) {
      action();
      return;
    }
    setAuthPrompt({ reason, action });
  }

  const effectiveBookmarkedKeys = IS_API_MODE
    ? articles.filter((a) => a.isSaved).map(getArticleKey)
    : bookmarkedKeys;
  const effectiveReadKeys = IS_API_MODE
    ? articles.filter((a) => a.isRead).map(getArticleKey)
    : readKeys;

  const activeCount = feeds.filter((f) => f.active).length;

  const selectedArticle = selectedArticleKey
    ? articles.find((a) => getArticleKey(a) === selectedArticleKey) ?? null
    : null;
  const previewArticle = selectedArticle;
  const previewArticleKey = selectedArticle ? selectedArticleKey : null;

  useEffect(() => {
    if (articles.length === 0) {
      setSelectedArticleKey(null);
      return;
    }

    if (!selectedArticleKey) {
      return;
    }

    const stillExists = articles.some((a) => getArticleKey(a) === selectedArticleKey);
    if (!stillExists) {
      setSelectedArticleKey(null);
    }
  }, [articles, selectedArticleKey]);

  useEffect(() => {
    if (IS_API_MODE) return;
    let cancelled = false;
    Promise.all([
      dataStore.load<string[]>(BOOKMARKS_STORAGE_KEY, []),
      dataStore.load<string[]>(READ_STORAGE_KEY, []),
    ]).then(([bookmarks, read]) => {
      if (cancelled) return;
      setBookmarkedKeys(asStringArray(bookmarks));
      setReadKeys(asStringArray(read));
      setReadStateLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (IS_API_MODE || !readStateLoaded) return;
    dataStore.save(BOOKMARKS_STORAGE_KEY, bookmarkedKeys);
  }, [bookmarkedKeys, readStateLoaded]);

  useEffect(() => {
    if (IS_API_MODE || !readStateLoaded) return;
    dataStore.save(READ_STORAGE_KEY, readKeys);
  }, [readKeys, readStateLoaded]);

  useEffect(() => {
    if (IS_API_MODE) return;
    let cancelled = false;
    dataStore.load<Record<string, Note[]>>(NOTES_STORAGE_KEY, {}).then((notes) => {
      if (cancelled) return;
      setNotesByArticle(asNotesRecord(notes));
      setNotesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (IS_API_MODE || !notesLoaded) return;
    dataStore.save(NOTES_STORAGE_KEY, notesByArticle);
  }, [notesByArticle, notesLoaded]);

  useEffect(() => {
    if (!IS_API_MODE) return;
    if (previewArticle?.id === undefined) {
      setPreviewNotes([]);
      return;
    }
    let cancelled = false;
    listNotesForArticle(previewArticle.id).then((result) => {
      if (!cancelled) setPreviewNotes(result);
    });
    return () => {
      cancelled = true;
    };
  }, [previewArticle?.id]);

  const effectiveNotes = IS_API_MODE
    ? previewNotes
    : previewArticleKey
      ? notesByArticle[previewArticleKey] ?? []
      : [];

  function handleSelectArticleKey(articleKey: string) {
    setSelectedArticleKey(articleKey);
    markArticleAsRead(articleKey);
  }

  function toggleBookmark(articleKey: string) {
    withAuth('Admin access required to save article', () => {
      if (IS_API_MODE) {
        const article = articles.find((a) => getArticleKey(a) === articleKey);
        if (article?.id === undefined) return;
        const articleId = article.id;
        const nextSaved = !article.isSaved;
        setArticleStateOverrides((prev) => ({ ...prev, [articleId]: { ...prev[articleId], isSaved: nextSaved } }));
        setArticleState(articleId, { is_saved: nextSaved }).catch(() => {
          setArticleStateOverrides((prev) => ({ ...prev, [articleId]: { ...prev[articleId], isSaved: !nextSaved } }));
        });
        return;
      }
      setBookmarkedKeys((prev) =>
        prev.includes(articleKey)
          ? prev.filter((key) => key !== articleKey)
          : [articleKey, ...prev]
      );
    });
  }

  function setArticleReadState(articleKey: string, isRead: boolean) {
    if (IS_API_MODE) {
      const article = articles.find((a) => getArticleKey(a) === articleKey);
      if (article?.id === undefined || article.isRead === isRead) return;
      const articleId = article.id;
      setArticleStateOverrides((prev) => ({ ...prev, [articleId]: { ...prev[articleId], isRead } }));
      setArticleState(articleId, { is_read: isRead }).catch(() => {
        setArticleStateOverrides((prev) => ({ ...prev, [articleId]: { ...prev[articleId], isRead: !isRead } }));
      });
      return;
    }
    setReadKeys((prev) => {
      const has = prev.includes(articleKey);
      if (isRead) return has ? prev : [articleKey, ...prev];
      return has ? prev.filter((key) => key !== articleKey) : prev;
    });
  }

  function markArticleAsRead(articleKey: string) {
    setArticleReadState(articleKey, true);
  }

  function toggleReadState(articleKey: string) {
    withAuth('Admin access required to update read state', () => {
      const isRead = effectiveReadKeys.includes(articleKey);
      setArticleReadState(articleKey, !isRead);
    });
  }

  function addNote(articleKey: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (IS_API_MODE) {
      const articleId = Number(articleKey);
      if (!Number.isFinite(articleId)) return;
      createNote(articleId, trimmed).then((note) => {
        setPreviewNotes((prev) => [note, ...prev]);
      });
      return;
    }

    const note: Note = { id: crypto.randomUUID(), text: trimmed, createdAt: new Date().toISOString() };
    setNotesByArticle((prev) => ({
      ...prev,
      [articleKey]: [note, ...(prev[articleKey] ?? [])],
    }));
  }

  function deleteNote(articleKey: string, noteId: string) {
    if (IS_API_MODE) {
      apiDeleteNote(noteId).then(() => {
        setPreviewNotes((prev) => prev.filter((n) => n.id !== noteId));
      });
      return;
    }
    setNotesByArticle((prev) => ({
      ...prev,
      [articleKey]: (prev[articleKey] ?? []).filter((n) => n.id !== noteId),
    }));
  }

  function editNote(articleKey: string, noteId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (IS_API_MODE) {
      apiUpdateNote(noteId, trimmed).then((updated) => {
        setPreviewNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      });
      return;
    }

    setNotesByArticle((prev) => ({
      ...prev,
      [articleKey]: (prev[articleKey] ?? []).map((n) => (n.id === noteId ? { ...n, text: trimmed } : n)),
    }));
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
        const maxWidth = Math.max(220, Math.min(420, Math.round(window.innerWidth * 0.32)));
        const clamped = Math.max(220, Math.min(maxWidth, rawWidth));
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

  useEffect(() => {
    function onResize() {
      const maxWidth = Math.max(220, Math.min(420, Math.round(window.innerWidth * 0.32)));
      setLeftPanelWidth((prev) => {
        const clamped = Math.max(220, Math.min(maxWidth, prev));
        if (clamped !== prev) {
          localStorage.setItem('news-left-panel-width', String(clamped));
        }
        return clamped;
      });
    }

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
        <span className="app-header-brand">Blue Rose News Feed</span>
        <SettingsPanel
          feeds={feeds}
          dataLoaded={feedsLoaded && keywordsLoaded}
          errors={errors}
          onToggle={toggleFeed}
          onRemove={removeFeed}
          onAdd={addFeed}
          keywords={keywords}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          authenticated={!IS_API_MODE || authenticated}
          onLogin={login}
          onLogout={async () => {
            await logout();
            setShowLogoutToast(true);
          }}
          authPromptReason={authPrompt?.reason ?? null}
          onAuthResolved={() => {
            const action = authPrompt?.action;
            setAuthPrompt(null);
            action?.();
          }}
          onAuthDismiss={() => setAuthPrompt(null)}
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
                bookmarkedKeys={effectiveBookmarkedKeys}
                readKeys={effectiveReadKeys}
                onToggleBookmark={toggleBookmark}
                onToggleReadState={toggleReadState}
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
              <ArticlePreview
                article={previewArticle}
                articleKey={previewArticleKey}
                bookmarked={previewArticleKey ? effectiveBookmarkedKeys.includes(previewArticleKey) : false}
                isRead={previewArticleKey ? effectiveReadKeys.includes(previewArticleKey) : false}
                onToggleBookmark={toggleBookmark}
                onToggleReadState={toggleReadState}
                notes={effectiveNotes}
                authenticated={!IS_API_MODE || authenticated}
                onLogin={login}
                onAddNote={addNote}
                onDeleteNote={deleteNote}
                onEditNote={editNote}
              />
            </aside>
          </div>
        </main>
      </div>

      <div className="toast-stack">
        {showGuestToast && (
          <div className="notice-toast" role="status">
            <span className="notice-toast-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="11" x2="12" y2="16" />
                <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <p className="notice-toast-text">
              You’re currently viewing the last saved version.
              <br />
              Log in to edit and save your changes.
            </p>
          </div>
        )}
        {showLogoutToast && (
          <div className="notice-toast notice-toast-compact" role="status">
            <span className="notice-toast-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="11" x2="12" y2="16" />
                <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <p className="notice-toast-text">Logged out successfully.</p>
          </div>
        )}
      </div>
    </div>
  );
}

