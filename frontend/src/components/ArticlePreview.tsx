import { useEffect, useRef, useState } from 'react';
import type { Article, Note } from '../types';

interface Props {
  article: Article | null;
  articleKey: string | null;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onMarkAsUnread: (articleKey: string) => void;
  onMarkAsRead: (articleKey: string) => void;
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
  const [loginForm, setLoginForm] = useState({ username: '', password: '', error: '' });
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const error = await onLogin(loginForm.username, loginForm.password);
    if (error) {
      setLoginForm((prev) => ({ ...prev, password: '', error }));
      return;
    }
    setLoginForm({ username: '', password: '', error: '' });
  }

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
        {notes.length === 0 && <p className="notes-empty">No notes yet.</p>}
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
        <form onSubmit={handleLogin} className="settings-login-form notes-login-form">
          <p className="notes-login-hint">Log in to add a note.</p>
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
      )}
    </div>
  );
}

function PreviewActions({
  articleKey,
  bookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsUnread,
  onMarkAsRead,
  notes,
  authenticated,
  onLogin,
  onAddNote,
  onDeleteNote,
  onEditNote,
}: {
  articleKey: string | null;
  bookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (articleKey: string) => void;
  onMarkAsUnread: (articleKey: string) => void;
  onMarkAsRead: (articleKey: string) => void;
  notes: Note[];
  authenticated: boolean;
  onLogin: (username: string, password: string) => Promise<string | null>;
  onAddNote: (articleKey: string, text: string) => void;
  onDeleteNote: (articleKey: string, noteId: string) => void;
  onEditNote: (articleKey: string, noteId: string, text: string) => void;
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
        notes={notes}
        authenticated={authenticated}
        onLogin={onLogin}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
        onEditNote={onEditNote}
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
