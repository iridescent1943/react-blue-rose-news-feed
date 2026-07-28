import { useState } from 'react';
import type { Feed, FeedKind } from '../types';

interface Props {
  feeds: Feed[];
  errors: Record<string, string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (name: string, url: string, kind: FeedKind) => void;
}

interface AddForm {
  name: string;
  url: string;
  error: string;
}

interface ConfirmState {
  removedCount: number;
  disabledCount: number;
}

interface LoginForm {
  username: string;
  password: string;
  error: string;
}

const EMPTY_FORM: AddForm = { name: '', url: '', error: '' };
const EMPTY_LOGIN: LoginForm = { username: '', password: '', error: '' };
const FEED_COLORS = [
  '#7b3f6e', '#4a2040', '#9b5a8a', '#c084b0',
  '#5c3d6b', '#a0527a', '#3d1f4f', '#b87ba0',
];
const ADMIN_AUTH_STORAGE_KEY = 'news-admin-authenticated';
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

function nextColor(feeds: Feed[]): string {
  const used = new Set(feeds.map((f) => f.color));
  return FEED_COLORS.find((c) => !used.has(c)) ?? FEED_COLORS[feeds.length % FEED_COLORS.length];
}

export function SettingsPanel({ feeds, errors, onToggle, onRemove, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true');
  const [draftFeeds, setDraftFeeds] = useState<Feed[]>(feeds);
  const [rssForm, setRssForm] = useState<AddForm>(EMPTY_FORM);
  const [alertForm, setAlertForm] = useState<AddForm>(EMPTY_FORM);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>(EMPTY_LOGIN);

  const rssFeeds = draftFeeds.filter((f) => f.kind === 'rss');
  const alertFeeds = draftFeeds.filter((f) => f.kind === 'google-alert');

  function openSettings() {
    setDraftFeeds(feeds);
    setRssForm(EMPTY_FORM);
    setAlertForm(EMPTY_FORM);
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
    setOpen(true);
  }

  function closeWithoutApply() {
    setDraftFeeds(feeds);
    setRssForm(EMPTY_FORM);
    setAlertForm(EMPTY_FORM);
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
    setOpen(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      setLoginForm((prev) => ({
        ...prev,
        password: '',
        error: 'Admin credentials are not configured.',
      }));
      return;
    }

    if (loginForm.username.trim() !== ADMIN_USERNAME || loginForm.password !== ADMIN_PASSWORD) {
      setLoginForm((prev) => ({
        ...prev,
        password: '',
        error: 'Invalid admin credentials',
      }));
      return;
    }

    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    setAuthenticated(true);
    setLoginForm(EMPTY_LOGIN);
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setAuthenticated(false);
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
  }

  function toggleDraftFeed(id: string) {
    setDraftFeeds((prev) => prev.map((feed) => (feed.id === id ? { ...feed, active: !feed.active } : feed)));
  }

  function removeDraftFeed(id: string) {
    setDraftFeeds((prev) => prev.filter((feed) => feed.id !== id));
  }

  function handleSubmit(kind: FeedKind, e: React.FormEvent) {
    e.preventDefault();
    const form = kind === 'rss' ? rssForm : alertForm;
    const setForm = kind === 'rss' ? setRssForm : setAlertForm;

    if (!form.name.trim()) {
      setForm((f) => ({ ...f, error: 'Name is required' }));
      return;
    }

    if (!form.url.trim()) {
      setForm((f) => ({ ...f, error: 'URL is required' }));
      return;
    }

    try {
      new URL(form.url.trim());
    } catch {
      setForm((f) => ({ ...f, error: 'Enter a valid URL' }));
      return;
    }

    const name = form.name.trim();
    const url = form.url.trim();

    setDraftFeeds((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        url,
        active: true,
        color: nextColor(prev),
        kind,
      },
    ]);

    setForm(EMPTY_FORM);
  }

  function applyChanges() {
    const originalById = new Map(feeds.map((feed) => [feed.id, feed]));
    const draftById = new Map(draftFeeds.map((feed) => [feed.id, feed]));

    feeds.forEach((feed) => {
      if (!draftById.has(feed.id)) {
        onRemove(feed.id);
      }
    });

    feeds.forEach((feed) => {
      const draftFeed = draftById.get(feed.id);
      if (!draftFeed) return;
      if (draftFeed.active !== feed.active) {
        onToggle(feed.id);
      }
    });

    draftFeeds.forEach((feed) => {
      if (!originalById.has(feed.id)) {
        onAdd(feed.name, feed.url, feed.kind);
      }
    });

    closeWithoutApply();
  }

  function handleApply() {
    const draftById = new Map(draftFeeds.map((feed) => [feed.id, feed]));

    const removedCount = feeds.filter((feed) => !draftById.has(feed.id)).length;
    const disabledCount = feeds.filter((feed) => {
      const draftFeed = draftById.get(feed.id);
      return !!draftFeed && feed.active && !draftFeed.active;
    }).length;

    if (removedCount > 0 || disabledCount > 0) {
      setConfirmState({ removedCount, disabledCount });
      return;
    }

    applyChanges();
  }

  return (
    <>
      <div className="settings-toolbar">
        <div className={`settings-menu-wrap ${authenticated ? 'authenticated' : ''}`}>
          <button
            className={`settings-toggle ${open ? 'open' : ''}`}
            onClick={() => (open ? closeWithoutApply() : openSettings())}
            aria-label="Toggle settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {authenticated && (
            <div className="settings-hover-menu" role="menu" aria-label="Settings actions">
              <button type="button" className="settings-hover-item" onClick={openSettings}>
                Settings
              </button>
              <button type="button" className="settings-hover-item" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className={`settings-panel ${open ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={closeWithoutApply} aria-label="Close settings">✕</button>
        </div>

        {authenticated ? (
          <>
            <section className="source-section">
              <h3 className="source-section-title">
                <span className="source-icon rss-icon">RSS</span> RSS Feeds
              </h3>
              <ul className="source-list">
                {rssFeeds.map((feed) => (
                  <FeedRow key={feed.id} feed={feed} error={errors[feed.id]} onToggle={toggleDraftFeed} onRemove={removeDraftFeed} />
                ))}
                {rssFeeds.length === 0 && <li className="source-empty">No RSS feeds added yet.</li>}
              </ul>
              <form onSubmit={(e) => handleSubmit('rss', e)} className="add-source-form">
                <input
                  type="text"
                  placeholder="RSS source name"
                  value={rssForm.name}
                  onChange={(e) => setRssForm((f) => ({ ...f, name: e.target.value, error: '' }))}
                />
                <input
                  type="url"
                  placeholder="RSS / Atom URL"
                  value={rssForm.url}
                  onChange={(e) => setRssForm((f) => ({ ...f, url: e.target.value, error: '' }))}
                />
                {rssForm.error && <p className="form-error">{rssForm.error}</p>}
                <button type="submit" className="btn-add">Add RSS feed</button>
              </form>
            </section>

            <section className="source-section">
              <h3 className="source-section-title">
                <span className="source-icon alert-icon">G</span> Google Alerts
              </h3>
              <p className="source-hint">
                In <a href="https://www.google.com/alerts" target="_blank" rel="noopener noreferrer">Google Alerts</a>,
                set delivery to <em>RSS feed</em> and paste the feed URL below.
              </p>
              <ul className="source-list">
                {alertFeeds.map((feed) => (
                  <FeedRow key={feed.id} feed={feed} error={errors[feed.id]} onToggle={toggleDraftFeed} onRemove={removeDraftFeed} />
                ))}
                {alertFeeds.length === 0 && <li className="source-empty">No Google Alerts added yet.</li>}
              </ul>
              <form onSubmit={(e) => handleSubmit('google-alert', e)} className="add-source-form">
                <input
                  type="text"
                  placeholder="Google Alert name"
                  value={alertForm.name}
                  onChange={(e) => setAlertForm((f) => ({ ...f, name: e.target.value, error: '' }))}
                />
                <input
                  type="url"
                  placeholder="Google Alert RSS URL"
                  value={alertForm.url}
                  onChange={(e) => setAlertForm((f) => ({ ...f, url: e.target.value, error: '' }))}
                />
                {alertForm.error && <p className="form-error">{alertForm.error}</p>}
                <button type="submit" className="btn-add">Add Google Alert</button>
              </form>
            </section>

            <div className="settings-footer">
              <button type="button" className="settings-footer-btn" onClick={closeWithoutApply}>Cancel</button>
              <button type="button" className="settings-footer-btn primary" onClick={handleApply}>Apply</button>
            </div>
          </>
        ) : (
          <section className="settings-login-section">
            <h3 className="source-section-title settings-login-title">Admin access required to edit settings</h3>
            <form onSubmit={handleLogin} className="settings-login-form">
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
              <div className="settings-login-actions">
                <button type="button" className="settings-footer-btn" onClick={closeWithoutApply}>Cancel</button>
                <button type="submit" className="settings-footer-btn primary">Log in</button>
              </div>
            </form>
          </section>
        )}
      </aside>

      {open && <div className="settings-backdrop" onClick={closeWithoutApply} />}
      {open && confirmState && (
        <>
          <div className="settings-confirm-backdrop" onClick={() => setConfirmState(null)} />
          <section className="settings-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirm settings changes">
            <div className="settings-confirm-head">
              <h3 className="settings-confirm-title">Confirm changes</h3>
            </div>
            <div className="settings-confirm-body">
              <p className="settings-confirm-text">
                {confirmState.removedCount > 0 && confirmState.disabledCount > 0
                  ? `You are about to remove ${confirmState.removedCount} source${confirmState.removedCount === 1 ? '' : 's'} and disable ${confirmState.disabledCount} source${confirmState.disabledCount === 1 ? '' : 's'}.`
                  : confirmState.removedCount > 0
                    ? `You are about to remove ${confirmState.removedCount} source${confirmState.removedCount === 1 ? '' : 's'}.`
                    : `You are about to disable ${confirmState.disabledCount} source${confirmState.disabledCount === 1 ? '' : 's'}.`}
              </p>
              <p className="settings-confirm-text">Do you want to continue?</p>
              <div className="settings-confirm-actions">
                <button type="button" className="settings-footer-btn" onClick={() => setConfirmState(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-footer-btn primary"
                  onClick={() => {
                    setConfirmState(null);
                    applyChanges();
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function FeedRow({ feed, error, onToggle, onRemove }: {
  feed: Feed;
  error?: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className={`source-row ${feed.active ? '' : 'inactive'}`}>
      <div className="source-main">
        <span className={`source-dot ${feed.active ? 'active' : 'inactive'}`} />
        <span className="source-name">{feed.name}</span>
      </div>
      {error && (
        <span className="source-error tooltip-anchor" data-tooltip={error}>
          ⚠
        </span>
      )}
      <div className="source-actions-right">
        <button
          className="source-action-btn source-disable-btn tooltip-anchor"
          onClick={() => onToggle(feed.id)}
          data-tooltip={feed.active ? 'Disable' : 'Enable'}
          aria-label={feed.active ? 'Disable' : 'Enable'}
        >
          ⟳
        </button>
        <button
          className="source-action-btn source-remove tooltip-anchor"
          onClick={() => onRemove(feed.id)}
          data-tooltip="Remove"
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
