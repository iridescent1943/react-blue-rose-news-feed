import { useEffect, useRef, useState } from 'react';
import type { Article, Note } from '../types';
import { summarizeArticle } from '../data/api/articles';
import { summarizeWithGemini } from '../data/geminiClient';

const IS_API_MODE = import.meta.env.VITE_DATA_BACKEND === 'api';

interface Props {
  article: Article | null;
  articleKey: string | null;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onToggleReadState: (articleKey: string) => void;
  notes: Note[];
  authenticated: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onAddNote: (articleKey: string, text: string) => void;
  onDeleteNote: (articleKey: string, noteId: string) => void;
  onEditNote: (articleKey: string, noteId: string, text: string) => void;
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function LoginForm({
  hint,
  onLogin,
  onSuccess,
}: {
  hint: string;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onSuccess?: () => void;
}) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '', error: '' });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const error = await onLogin(loginForm.username, loginForm.password);
    if (error) {
      setLoginForm((prev) => ({ ...prev, password: '', error }));
      return;
    }
    setLoginForm({ username: '', password: '', error: '' });
    onSuccess?.();
  }

  return (
    <form onSubmit={handleLogin} className="settings-login-form notes-login-form">
      <p className="notes-login-hint">{hint}</p>
      <input
        type="text"
        placeholder="Username"
        value={loginForm.username}
        onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value, error: '' }))}
      />
      <input
        type="password"
        placeholder="Password"
        value={loginForm.password}
        onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value, error: '' }))}
      />
      {loginForm.error && <p className="form-error">{loginForm.error}</p>}
      <button type="submit" className="settings-footer-btn primary">Log in</button>
    </form>
  );
}

function InlineAuthAction({
  authenticated,
  onLogin,
  hint,
  action,
  children,
}: {
  authenticated: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  hint: string;
  action: () => void;
  children: (onClick: () => void) => React.ReactNode;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loginOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [loginOpen]);

  function handleClick() {
    if (!authenticated) {
      setLoginOpen((prev) => !prev);
      return;
    }
    action();
  }

  return (
    <div className="notes-menu-wrap" ref={wrapRef}>
      {children(handleClick)}
      {loginOpen && (
        <div className="notes-popover" role="dialog" aria-label="Log in">
          <LoginForm
            hint={hint}
            onLogin={onLogin}
            onSuccess={() => {
              setLoginOpen(false);
              action();
            }}
          />
        </div>
      )}
    </div>
  );
}

function NotesPopover({
  articleKey,
  notes,
  authenticated,
  onLogin,
  onAddNote,
  onDeleteNote,
  onEditNote,
  onClose,
}: {
  articleKey: string;
  notes: Note[];
  authenticated: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onAddNote: (articleKey: string, text: string) => void;
  onDeleteNote: (articleKey: string, noteId: string) => void;
  onEditNote: (articleKey: string, noteId: string, text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onAddNote(articleKey, draft);
    setDraft('');
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditDraft(note.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  function handleSaveEdit(e: React.FormEvent, noteId: string) {
    e.preventDefault();
    if (!editDraft.trim()) return;
    onEditNote(articleKey, noteId, editDraft);
    setEditingId(null);
    setEditDraft('');
  }

  return (
    <div className="notes-popover" ref={popoverRef} role="dialog" aria-label="Notes">
      <div className="notes-list">
        {notes.length === 0 && <p className="notes-empty">No notes yet</p>}
        {notes.map((note) =>
          editingId === note.id ? (
            <form key={note.id} className="note-item note-edit-form" onSubmit={(e) => handleSaveEdit(e, note.id)}>
              <textarea
                className="notes-add-textarea"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="note-edit-actions">
                <button type="button" className="settings-footer-btn" onClick={cancelEdit}>Cancel</button>
                <button type="submit" className="settings-footer-btn primary" disabled={!editDraft.trim()}>Save</button>
              </div>
            </form>
          ) : (
            <div key={note.id} className="note-item">
              <p className="note-item-text">{note.text}</p>
              <div className="note-item-meta">
                <span className="note-item-date">{formatNoteDate(note.createdAt)}</span>
                {authenticated && (
                  <span className="note-item-actions">
                    <button
                      type="button"
                      className="note-item-edit tooltip-anchor"
                      aria-label="Edit note"
                      data-tooltip="Edit"
                      onClick={() => startEdit(note)}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                        <path
                          d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0L4 16v4z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line x1="13.5" y1="6.5" x2="17.5" y2="10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="note-item-delete tooltip-anchor"
                      aria-label="Delete note"
                      data-tooltip="Delete"
                      onClick={() => onDeleteNote(articleKey, note.id)}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {authenticated ? (
        <form onSubmit={handleAdd} className="notes-add-form">
          <textarea
            className="notes-add-textarea"
            placeholder="Add a note..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <button type="submit" className="settings-footer-btn primary" disabled={!draft.trim()}>
            Add note
          </button>
        </form>
      ) : (
        <LoginForm hint="Log in to add a note" onLogin={onLogin} />
      )}
    </div>
  );
}

interface ArticleSummaryState {
  text: string;
  model: string;
  generatedAt: string;
}

const SUMMARY_STORAGE_KEY = 'news-article-summaries';

function isArticleSummaryState(value: unknown): value is ArticleSummaryState {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ArticleSummaryState).text === 'string' &&
    typeof (value as ArticleSummaryState).model === 'string' &&
    typeof (value as ArticleSummaryState).generatedAt === 'string'
  );
}

function loadCachedSummaries(): Record<string, ArticleSummaryState> {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, ArticleSummaryState> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isArticleSummaryState(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function AiSummaryPanel({
  summary,
  loading,
  error,
  onRegenerate,
  onClose,
}: {
  summary?: ArticleSummaryState;
  loading: boolean;
  error: string;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="preview-summary-panel" aria-label="AI summary">
      <div className="ai-summary-header">
        <span className="ai-summary-title">Summary</span>
        <div className="ai-summary-header-actions">
          <button
            type="button"
            className="ai-summary-icon-btn tooltip-anchor"
            aria-label="Regenerate summary"
            data-tooltip="Regenerate"
            onClick={onRegenerate}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="ai-summary-icon-btn tooltip-anchor"
            aria-label="Close summary"
            data-tooltip="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {loading && <p className="notes-empty">Generating summary...</p>}
      {!loading && error && <p className="form-error">{error}</p>}
      {!loading && !error && summary && (
        <>
          <p className="ai-summary-text">{summary.text}</p>
          <p className="ai-summary-meta">
            <span>Summarized by <span className="ai-summary-model">{summary.model}</span></span>
            <span className="ai-summary-meta-sep" aria-hidden="true">·</span>
            <span className="ai-summary-timestamp">{formatNoteDate(summary.generatedAt)}</span>
          </p>
        </>
      )}
    </aside>
  );
}

function PreviewActions({
  articleKey,
  articleId,
  bookmarked,
  isRead,
  onToggleBookmark,
  onToggleReadState,
  notes,
  authenticated,
  onLogin,
  onAddNote,
  onDeleteNote,
  onEditNote,
  summaryOpen,
  onToggleSummary,
}: {
  articleKey: string | null;
  articleId?: number;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onToggleReadState: (articleKey: string) => void;
  notes: Note[];
  authenticated: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onAddNote: (articleKey: string, text: string) => void;
  onDeleteNote: (articleKey: string, noteId: string) => void;
  onEditNote: (articleKey: string, noteId: string, text: string) => void;
  summaryOpen: boolean;
  onToggleSummary: () => void;
}) {
  const disabled = !articleKey;
  const [notesOpen, setNotesOpen] = useState(false);
  const [prevArticleKey, setPrevArticleKey] = useState(articleKey);

  if (articleKey !== prevArticleKey) {
    setPrevArticleKey(articleKey);
    setNotesOpen(false);
  }

  return (
    <div className="preview-actions-row">
      <InlineAuthAction
        key={`save-${articleKey ?? 'none'}`}
        authenticated={authenticated}
        onLogin={onLogin}
        hint="Log in to save article"
        action={() => articleKey && onToggleBookmark(articleKey)}
      >
        {(onClick) => (
          <button
            type="button"
            className={`preview-action-btn tooltip-anchor ${bookmarked ? 'active' : ''}`}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Saved' : 'Save'}
            data-tooltip={bookmarked ? 'Saved' : 'Save'}
            disabled={disabled}
            onClick={onClick}
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
        )}
      </InlineAuthAction>
      <InlineAuthAction
        key={`read-${articleKey ?? 'none'}`}
        authenticated={authenticated}
        onLogin={onLogin}
        hint="Log in to update read state"
        action={() => articleKey && onToggleReadState(articleKey)}
      >
        {(onClick) => (
          <button
            type="button"
            className={`preview-action-btn tooltip-anchor ${isRead ? '' : 'active'}`}
            aria-pressed={!isRead}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
            data-tooltip={isRead ? 'Mark as unread' : 'Mark as read'}
            disabled={disabled}
            onClick={onClick}
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
        )}
      </InlineAuthAction>
      <div className="notes-menu-wrap">
        <button
          type="button"
          className={`preview-action-btn tooltip-anchor ${notes.length > 0 ? 'active' : ''}`}
          aria-pressed={notesOpen}
          aria-label="Notes"
          data-tooltip="Notes"
          disabled={disabled}
          onClick={() => setNotesOpen((prev) => !prev)}
        >
          <svg
            className="preview-action-icon"
            viewBox="0 0 24 24"
            width="19"
            height="19"
            aria-hidden="true"
          >
            <path
              d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
              fill={notes.length > 0 ? 'currentColor' : 'transparent'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M15 4v4a1 1 0 0 0 1 1h4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <line x1="7" y1="13" x2="13" y2="13" stroke={notes.length > 0 ? 'var(--rose-bg-color, #fff)' : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="7" y1="16.5" x2="11" y2="16.5" stroke={notes.length > 0 ? 'var(--rose-bg-color, #fff)' : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {notes.length > 0 && <span className="notes-count-badge">{notes.length}</span>}
        </button>
        {notesOpen && articleKey && (
          <NotesPopover
            articleKey={articleKey}
            notes={notes}
            authenticated={authenticated}
            onLogin={onLogin}
            onAddNote={onAddNote}
            onDeleteNote={onDeleteNote}
            onEditNote={onEditNote}
            onClose={() => setNotesOpen(false)}
          />
        )}
      </div>
      <div className="notes-menu-wrap">
        <button
          type="button"
          className={`preview-action-btn tooltip-anchor ${summaryOpen ? 'active' : ''}`}
          aria-pressed={summaryOpen}
          aria-label="Summarize with AI"
          data-tooltip={IS_API_MODE && !articleId ? 'Summarize feature not available' : 'Summarize'}
          disabled={disabled || (IS_API_MODE && !articleId)}
          onClick={onToggleSummary}
        >
          <svg
            className="preview-action-icon"
            viewBox="0 0 24 24"
            width="19"
            height="19"
            aria-hidden="true"
          >
            <line x1="4.5" y1="19.5" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="5.21" y1="17.51" x2="6.49" y2="18.79" stroke="var(--rose-bg-color, #fff)" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="6.56" y1="16.16" x2="7.84" y2="17.44" stroke="var(--rose-bg-color, #fff)" strokeWidth="1.1" strokeLinecap="round" />
            <path
              d="M18.5 2.8c.25 1.5.75 2.6 1.5 3.35.75.75 1.85 1.25 3.35 1.5-1.5.25-2.6.75-3.35 1.5-.75.75-1.25 1.85-1.5 3.35-.25-1.5-.75-2.6-1.5-3.35-.75-.75-1.85-1.25-3.35-1.5 1.5-.25 2.6-.75 3.35-1.5.75-.75 1.25-1.85 1.5-3.35z"
              fill="currentColor"
            />
            <path
              d="M7.2 1.9c.12.75.36 1.28.74 1.66.38.38.91.62 1.66.74-.75.12-1.28.36-1.66.74-.38.38-.62.91-.74 1.66-.12-.75-.36-1.28-.74-1.66-.38-.38-.91-.62-1.66-.74.75-.12 1.28-.36 1.66-.74.38-.38.62-.91.74-1.66z"
              fill="currentColor"
            />
            <circle cx="16.5" cy="16.5" r="0.9" fill="currentColor" />
          </svg>
        </button>
      </div>
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
  onToggleReadState,
  notes,
  authenticated,
  onLogin,
  onAddNote,
  onDeleteNote,
  onEditNote,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [fullContent, setFullContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, ArticleSummaryState>>(loadCachedSummaries);
  const [summaryOpen, setSummaryOpen] = useState(() => !!articleKey && !!summaries[articleKey]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [prevArticleKey, setPrevArticleKey] = useState(articleKey);

  if (articleKey !== prevArticleKey) {
    setPrevArticleKey(articleKey);
    setSummaryOpen(!!articleKey && !!summaries[articleKey]);
  }

  const articleId = article?.id;

  useEffect(() => {
    try {
      localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded) - cache is best-effort.
    }
  }, [summaries]);

  function requestSummary(signal?: AbortSignal) {
    if (IS_API_MODE) {
      if (!articleId) return Promise.reject(new Error('Summarize feature not available'));
      return summarizeArticle(articleId, signal);
    }
    return summarizeWithGemini(fullContent || article?.description || '', signal);
  }

  function regenerateSummary() {
    if (!articleKey) return;
    setSummaryLoading(true);
    setSummaryError('');
    requestSummary()
      .then((result) => {
        setSummaries((prev) => ({
          ...prev,
          [articleKey]: { text: result.text, model: result.model, generatedAt: new Date().toISOString() },
        }));
      })
      .catch((err) => setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary'))
      .finally(() => setSummaryLoading(false));
  }

  useEffect(() => {
    if (!summaryOpen || !articleKey) return;
    if (IS_API_MODE && !articleId) return;
    setSummaryError('');
    if (summaries[articleKey]) return;

    const controller = new AbortController();
    setSummaryLoading(true);
    requestSummary(controller.signal)
      .then((result) => {
        setSummaries((prev) => ({
          ...prev,
          [articleKey]: { text: result.text, model: result.model, generatedAt: new Date().toISOString() },
        }));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary');
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryOpen, articleKey, articleId]);

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
        articleId={article.id}
        bookmarked={bookmarked}
        isRead={isRead}
        onToggleBookmark={onToggleBookmark}
        onToggleReadState={onToggleReadState}
        notes={notes}
        authenticated={authenticated}
        onLogin={onLogin}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
        onEditNote={onEditNote}
        summaryOpen={summaryOpen}
        onToggleSummary={() => setSummaryOpen((prev) => !prev)}
      />
      <div className="preview-body">
        <div className="preview-main-col">
          <h2 className="preview-title">{article.title}</h2>
          {summaryOpen && articleKey && (
            <AiSummaryPanel
              summary={summaries[articleKey]}
              loading={summaryLoading}
              error={summaryError}
              onRegenerate={regenerateSummary}
              onClose={() => setSummaryOpen(false)}
            />
          )}
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
            {article.link && (
              <a
                className="preview-link-icon tooltip-anchor"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open original article"
                data-tooltip="Open original article"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path
                    d="M14 4.5h5.5v5.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M19.2 4.8 10 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path
                    d="M17.5 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
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
          {!contentLoading && previewContent && (
            <div className="preview-end-marker" role="presentation">
              <span>End of article</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
