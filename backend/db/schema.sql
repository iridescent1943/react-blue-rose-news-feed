-- users
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'guest')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- login_codes
CREATE TABLE IF NOT EXISTS login_codes (
  login_code_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS login_codes_user_id_idx ON login_codes (user_id);
CREATE INDEX IF NOT EXISTS login_codes_expires_at_idx ON login_codes (expires_at);

-- feeds
CREATE TABLE IF NOT EXISTS feeds (
  feed_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'rss' CHECK (source_type IN ('rss', 'google_alert')),
  feed_url TEXT NOT NULL,
  normalized_feed_url TEXT NOT NULL UNIQUE,
  title TEXT,
  site_url TEXT,
  icon_url TEXT,
  added_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_fetched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS feeds_active_fetch_idx ON feeds (last_fetched_at NULLS FIRST) WHERE status = 'active';

-- articles
CREATE TABLE IF NOT EXISTS articles (
  article_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES feeds(feed_id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  content_html TEXT,
  content_text TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))
  ) STORED,
  UNIQUE (feed_id, guid)
);

CREATE INDEX IF NOT EXISTS articles_search_vector_idx ON articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS articles_feed_id_published_at_idx ON articles (feed_id, published_at DESC);

-- article_states
CREATE TABLE IF NOT EXISTS article_states (
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS article_states_article_id_idx ON article_states (article_id);
CREATE INDEX IF NOT EXISTS article_states_user_id_is_saved_idx ON article_states (user_id, is_saved);
CREATE INDEX IF NOT EXISTS article_states_user_id_is_read_idx ON article_states (user_id, is_read);

-- keywords
CREATE TABLE IF NOT EXISTS keywords (
  keyword_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feed_id INTEGER REFERENCES feeds(feed_id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keywords_global_term_idx ON keywords (lower(keyword)) WHERE feed_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS keywords_feed_term_idx ON keywords (feed_id, lower(keyword)) WHERE feed_id IS NOT NULL;

-- notes
CREATE TABLE IF NOT EXISTS notes (
  note_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(article_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notes_active_user_id_article_id_idx ON notes (user_id, article_id) WHERE deleted_at IS NULL;

-- functions / triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_set_updated_at ON notes;
CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
