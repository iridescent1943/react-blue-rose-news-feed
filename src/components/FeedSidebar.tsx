import { useState } from 'react';
import type { Feed } from '../types';

interface Props {
  feeds: Feed[];
  errors: Record<string, string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (name: string, url: string) => void;
}

export function FeedSidebar({ feeds, errors, onToggle, onRemove, onAdd }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (!url.trim()) { setFormError('URL is required'); return; }
    try { new URL(url.trim()); } catch {
      setFormError('Enter a valid URL');
      return;
    }
    onAdd(name, url);
    setName('');
    setUrl('');
    setFormError('');
    setShowForm(false);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>My Feeds</h2>
        <button className="btn-icon" onClick={() => setShowForm((v) => !v)} title="Add feed">
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {showForm && (
        <form className="add-feed-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Feed name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="url"
            placeholder="RSS / Atom URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="btn-primary">Add feed</button>
        </form>
      )}

      <ul className="feed-list">
        {feeds.map((feed) => (
          <li key={feed.id} className={`feed-item ${feed.active ? 'active' : 'inactive'}`}>
            <button
              className="feed-toggle"
              onClick={() => onToggle(feed.id)}
              title={feed.active ? 'Disable feed' : 'Enable feed'}
            >
              <span className="feed-dot" style={{ background: feed.active ? feed.color : '#aaa' }} />
              <span className="feed-name">{feed.name}</span>
            </button>
            {errors[feed.id] && (
              <span className="feed-error" title={errors[feed.id]}>⚠</span>
            )}
            <button
              className="feed-remove"
              onClick={() => onRemove(feed.id)}
              title="Remove feed"
            >
              ✕
            </button>
          </li>
        ))}
        {feeds.length === 0 && (
          <li className="feed-empty">No feeds yet. Add one above.</li>
        )}
      </ul>
    </aside>
  );
}
