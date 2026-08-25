import { useState } from 'react';
import type { Feed, FeedKind, Keyword } from '../types';

interface Props {
  feeds: Feed[];
  errors: Record<string, string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (id: string, name: string, url: string, kind: FeedKind) => void;
  keywords: Keyword[];
  onAddKeyword: (keyword: string, feedId: string | null) => void;
  onRemoveKeyword: (id: string) => void;
  authenticated: boolean;
  onLogin: (username: string, password: string) => string | null;
  onLogout: () => void;
}

interface AddForm {
  name: string;
  url: string;
  keyword: string;
  global: boolean;
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

const EMPTY_FORM: AddForm = { name: '', url: '', keyword: '', global: false, error: '' };
const EMPTY_LOGIN: LoginForm = { username: '', password: '', error: '' };
const FEED_COLORS = [
  '#7b3f6e', '#4a2040', '#9b5a8a', '#c084b0',
  '#5c3d6b', '#a0527a', '#3d1f4f', '#b87ba0',
];

function nextColor(feeds: Feed[]): string {
  const used = new Set(feeds.map((f) => f.color));
  return FEED_COLORS.find((c) => !used.has(c)) ?? FEED_COLORS[feeds.length % FEED_COLORS.length];
}

export function SettingsPanel({
  feeds,
  errors,
  onToggle,
  onRemove,
  onAdd,
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  authenticated,
  onLogin,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draftFeeds, setDraftFeeds] = useState<Feed[]>(feeds);
  const [draftKeywords, setDraftKeywords] = useState<Keyword[]>(keywords);
  const [addKind, setAddKind] = useState<FeedKind>('rss');
  const [sourceForm, setSourceForm] = useState<AddForm>(EMPTY_FORM);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>(EMPTY_LOGIN);

  const rssFeeds = draftFeeds.filter((f) => f.kind === 'rss');
  const alertFeeds = draftFeeds.filter((f) => f.kind === 'google-alert');
  const globalKeywords = draftKeywords.filter((k) => k.feedId === null);

  function openSettings() {
    setDraftFeeds(feeds);
    setDraftKeywords(keywords);
    setAddKind('rss');
    setSourceForm(EMPTY_FORM);
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
    setOpen(true);
  }

  function closeWithoutApply() {
    setDraftFeeds(feeds);
    setDraftKeywords(keywords);
    setAddKind('rss');
    setSourceForm(EMPTY_FORM);
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
    setOpen(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const error = onLogin(loginForm.username, loginForm.password);
    if (error) {
      setLoginForm((prev) => ({ ...prev, password: '', error }));
      return;
    }

    setLoginForm(EMPTY_LOGIN);
  }

  function handleLogout() {
    onLogout();
    setConfirmState(null);
    setLoginForm(EMPTY_LOGIN);
  }

  function toggleDraftFeed(id: string) {
    setDraftFeeds((prev) => prev.map((feed) => (feed.id === id ? { ...feed, active: !feed.active } : feed)));
  }

  function removeDraftFeed(id: string) {
    setDraftFeeds((prev) => prev.filter((feed) => feed.id !== id));
  }

  function removeDraftKeyword(id: string) {
    setDraftKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  function addDraftKeyword(keyword: string, feedId: string | null) {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setDraftKeywords((prev) => [...prev, { id: crypto.randomUUID(), keyword: trimmed, feedId }]);
  }

  function removeKeywordFromFeed(keywordId: string, feedId: string) {
    setDraftKeywords((prev) => {
      const target = prev.find((k) => k.id === keywordId);
      if (!target) return prev;

      if (target.feedId !== null) {
        return prev.filter((k) => k.id !== keywordId);
      }

      // Global keyword removed from just this one feed: keep it applied to
      // every other existing feed, drop it only for this one.
      const otherFeeds = draftFeeds.filter((f) => f.id !== feedId);
      const materialized = otherFeeds.map((f) => ({
        id: crypto.randomUUID(),
        keyword: target.keyword,
        feedId: f.id,
      }));
      return [...prev.filter((k) => k.id !== keywordId), ...materialized];
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sourceForm.name.trim()) {
      setSourceForm((f) => ({ ...f, error: 'Name is required' }));
      return;
    }

    if (!sourceForm.url.trim()) {
      setSourceForm((f) => ({ ...f, error: 'URL is required' }));
      return;
    }

    try {
      new URL(sourceForm.url.trim());
    } catch {
      setSourceForm((f) => ({ ...f, error: 'Enter a valid URL' }));
      return;
    }

    const name = sourceForm.name.trim();
    const url = sourceForm.url.trim();
    const keyword = sourceForm.keyword.trim();
    const feedId = crypto.randomUUID();

    setDraftFeeds((prev) => [
      ...prev,
      {
        id: feedId,
        name,
        url,
        active: true,
        color: nextColor(prev),
        kind: addKind,
      },
    ]);

    if (keyword) {
      setDraftKeywords((prev) => [
        ...prev,
        { id: crypto.randomUUID(), keyword, feedId: sourceForm.global ? null : feedId },
      ]);
    }

    setSourceForm(EMPTY_FORM);
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
        onAdd(feed.id, feed.name, feed.url, feed.kind);
      }
    });

    const originalKeywordIds = new Set(keywords.map((k) => k.id));
    const draftKeywordIds = new Set(draftKeywords.map((k) => k.id));

    keywords.forEach((k) => {
      if (!draftKeywordIds.has(k.id)) {
        onRemoveKeyword(k.id);
      }
    });

    draftKeywords.forEach((k) => {
      if (!originalKeywordIds.has(k.id)) {
        onAddKeyword(k.keyword, k.feedId);
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

        <div className="settings-panel-scroll">
        {authenticated ? (
          <>
            <section className="source-section">
              <h3 className="source-section-title">
                <span className="source-icon rss-icon">RSS</span> RSS Feeds
              </h3>
              <ul className="source-list">
                {rssFeeds.map((feed) => (
                  <FeedRow
                    key={feed.id}
                    feed={feed}
                    error={errors[feed.id]}
                    keywords={draftKeywords.filter((k) => k.feedId === feed.id || k.feedId === null)}
                    onToggle={toggleDraftFeed}
                    onRemove={removeDraftFeed}
                    onRemoveKeyword={removeKeywordFromFeed}
                    onAddKeyword={addDraftKeyword}
                  />
                ))}
                {rssFeeds.length === 0 && <li className="source-empty">No RSS feeds added yet.</li>}
              </ul>
            </section>

            <section className="source-section">
              <h3 className="source-section-title">
                <span className="source-icon alert-icon">G</span> Google Alerts
              </h3>
              <ul className="source-list">
                {alertFeeds.map((feed) => (
                  <FeedRow
                    key={feed.id}
                    feed={feed}
                    error={errors[feed.id]}
                    keywords={draftKeywords.filter((k) => k.feedId === feed.id || k.feedId === null)}
                    onToggle={toggleDraftFeed}
                    onRemove={removeDraftFeed}
                    onRemoveKeyword={removeKeywordFromFeed}
                    onAddKeyword={addDraftKeyword}
                  />
                ))}
                {alertFeeds.length === 0 && <li className="source-empty">No Google Alerts added yet.</li>}
              </ul>
            </section>

            <section className="source-section">
              <h3 className="source-section-title">Add a source</h3>

              <div className="global-keywords-bar">
                <span className="global-keywords-label">Global keywords</span>
                {globalKeywords.map((kw) => (
                  <KeywordChip key={kw.id} keyword={kw} onRemove={removeDraftKeyword} />
                ))}
                <KeywordAddInput onAdd={(kw) => addDraftKeyword(kw, null)} />
              </div>

              <div className="kind-row">
                <label className={`kind-btn ${addKind === 'rss' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="add-source-kind"
                    checked={addKind === 'rss'}
                    onChange={() => setAddKind('rss')}
                  />
                  <span className="source-icon rss-icon">RSS</span> RSS Feed
                </label>
                <label className={`kind-btn ${addKind === 'google-alert' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="add-source-kind"
                    checked={addKind === 'google-alert'}
                    onChange={() => setAddKind('google-alert')}
                  />
                  <span className="source-icon alert-icon">G</span> Google Alert
                </label>
              </div>

              <p className="source-hint">
                {addKind === 'google-alert' ? (
                  <>
                    In <a href="https://www.google.com/alerts" target="_blank" rel="noopener noreferrer">Google Alerts</a>,
                    set delivery to <em>RSS feed</em> and paste the URL below.
                  </>
                ) : (
                  'Paste the RSS or Atom feed URL below.'
                )}
              </p>

              <form onSubmit={handleSubmit} className="add-source-form">
                <input
                  type="text"
                  placeholder={addKind === 'rss' ? 'RSS source name' : 'Google Alert name'}
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm((f) => ({ ...f, name: e.target.value, error: '' }))}
                />
                <input
                  type="url"
                  placeholder={addKind === 'rss' ? 'RSS / Atom URL' : 'Google Alert RSS URL'}
                  value={sourceForm.url}
                  onChange={(e) => setSourceForm((f) => ({ ...f, url: e.target.value, error: '' }))}
                />
                <input
                  type="text"
                  placeholder="Keyword filter (optional)"
                  value={sourceForm.keyword}
                  onChange={(e) => setSourceForm((f) => ({ ...f, keyword: e.target.value, error: '' }))}
                />
                <label className="keyword-global-check">
                  <input
                    type="checkbox"
                    checked={sourceForm.global}
                    onChange={(e) => setSourceForm((f) => ({ ...f, global: e.target.checked }))}
                  />
                  Apply to all feeds
                </label>
                {sourceForm.error && <p className="form-error">{sourceForm.error}</p>}
                <button type="submit" className="btn-add">
                  {addKind === 'rss' ? 'Add RSS feed' : 'Add Google Alert'}
                </button>
              </form>
            </section>
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
        </div>

        {authenticated && (
          <div className="settings-footer">
            <button type="button" className="settings-footer-btn" onClick={closeWithoutApply}>Cancel</button>
            <button type="button" className="settings-footer-btn primary" onClick={handleApply}>Apply</button>
          </div>
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

function KeywordAddInput({ onAdd }: { onAdd: (keyword: string) => void }) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  }

  return (
    <form className="keyword-add-inline" onSubmit={handleSubmit}>
      <input
        type="text"
        className="keyword-add-input"
        placeholder="+ Add keyword"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value.trim() && (
        <button type="submit" className="keyword-add-confirm" aria-label="Save keyword">
          ✓
        </button>
      )}
    </form>
  );
}

function KeywordChip({ keyword, onRemove }: {
  keyword: Keyword;
  onRemove: (id: string) => void;
}) {
  return (
    <span className="keyword-chip">
      {keyword.keyword}
      <button
        type="button"
        className="keyword-chip-remove"
        onClick={() => onRemove(keyword.id)}
        aria-label={`Remove keyword ${keyword.keyword}`}
      >
        ✕
      </button>
    </span>
  );
}

function FeedRow({ feed, error, keywords, onToggle, onRemove, onRemoveKeyword, onAddKeyword }: {
  feed: Feed;
  error?: string;
  keywords: Keyword[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onRemoveKeyword: (keywordId: string, feedId: string) => void;
  onAddKeyword: (keyword: string, feedId: string | null) => void;
}) {
  return (
    <li className={`source-row ${feed.active ? '' : 'inactive'}`}>
      <div className="source-row-main-line">
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
      </div>
      <div className="keyword-chip-row">
        {keywords.map((kw) => (
          <KeywordChip key={kw.id} keyword={kw} onRemove={(id) => onRemoveKeyword(id, feed.id)} />
        ))}
        <KeywordAddInput onAdd={(kw) => onAddKeyword(kw, feed.id)} />
      </div>
    </li>
  );
}
