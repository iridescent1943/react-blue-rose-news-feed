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
  kind: FeedKind;
  name: string;
  url: string;
  error: string;
}

const EMPTY_FORM: AddForm = { kind: 'rss', name: '', url: '', error: '' };

export function SettingsPanel({ feeds, errors, onToggle, onRemove, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  const rssFeeds = feeds.filter((f) => f.kind === 'rss');
  const alertFeeds = feeds.filter((f) => f.kind === 'google-alert');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setForm((f) => ({ ...f, error: 'Name is required' })); return; }
    if (!form.url.trim()) { setForm((f) => ({ ...f, error: 'URL is required' })); return; }
    try { new URL(form.url.trim()); } catch {
      setForm((f) => ({ ...f, error: 'Enter a valid URL' }));
      return;
    }
    onAdd(form.name, form.url, form.kind);
    setForm(EMPTY_FORM);
  }

  return (
    <>
      <button
        className={`settings-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Open settings"
        aria-label="Toggle settings"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <aside className={`settings-panel ${open ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={() => setOpen(false)} aria-label="Close settings">✕</button>
        </div>

        {/* RSS Feeds */}
        <section className="source-section">
          <h3 className="source-section-title">
            <span className="source-icon rss-icon">RSS</span> RSS Feeds
          </h3>
          <ul className="source-list">
            {rssFeeds.map((feed) => (
              <FeedRow key={feed.id} feed={feed} error={errors[feed.id]} onToggle={onToggle} onRemove={onRemove} />
            ))}
            {rssFeeds.length === 0 && <li className="source-empty">No RSS feeds added yet.</li>}
          </ul>
        </section>

        {/* Google Alerts */}
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
              <FeedRow key={feed.id} feed={feed} error={errors[feed.id]} onToggle={onToggle} onRemove={onRemove} />
            ))}
            {alertFeeds.length === 0 && <li className="source-empty">No Google Alerts added yet.</li>}
          </ul>
        </section>

        {/* Add source form */}
        <section className="source-section add-source-section">
          <h3 className="source-section-title">Add Source</h3>
          <form onSubmit={handleSubmit} className="add-source-form">
            <div className="form-row kind-row">
              <label className={`kind-btn ${form.kind === 'rss' ? 'selected' : ''}`}>
                <input type="radio" name="kind" value="rss" checked={form.kind === 'rss'}
                  onChange={() => setForm((f) => ({ ...f, kind: 'rss' }))} /> RSS Feed
              </label>
              <label className={`kind-btn ${form.kind === 'google-alert' ? 'selected' : ''}`}>
                <input type="radio" name="kind" value="google-alert" checked={form.kind === 'google-alert'}
                  onChange={() => setForm((f) => ({ ...f, kind: 'google-alert' }))} /> Google Alert
              </label>
            </div>
            <input type="text" placeholder="Source name"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, error: '' }))} />
            <input type="url" placeholder={form.kind === 'google-alert' ? 'Google Alert RSS URL' : 'RSS / Atom URL'}
              value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value, error: '' }))} />
            {form.error && <p className="form-error">{form.error}</p>}
            <button type="submit" className="btn-add">Add source</button>
          </form>
        </section>
      </aside>

      {open && <div className="settings-backdrop" onClick={() => setOpen(false)} />}
    </>
  );
}

function FeedRow({ feed, error, onToggle, onRemove }: {
  feed: Feed; error?: string;
  onToggle: (id: string) => void; onRemove: (id: string) => void;
}) {
  return (
    <li className={`source-row ${feed.active ? '' : 'inactive'}`}>
      <button className="source-toggle" onClick={() => onToggle(feed.id)} title={feed.active ? 'Disable' : 'Enable'}>
        <span className="source-dot" style={{ background: feed.active ? feed.color : '#aaa' }} />
        <span className="source-name">{feed.name}</span>
      </button>
      {error && <span className="source-error" title={error}>⚠</span>}
      <button className="source-remove" onClick={() => onRemove(feed.id)} title="Remove">✕</button>
    </li>
  );
}
