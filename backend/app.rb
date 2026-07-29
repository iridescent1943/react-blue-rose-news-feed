require 'sinatra'
require 'json'
require 'pg'
require 'uri'

set :bind, '0.0.0.0'
set :port, ENV.fetch('PORT', 3000)

db_uri = URI.parse(ENV.fetch('DATABASE_URL'))
DB = PG::Connection.new(
  host: db_uri.host,
  port: db_uri.port || 5432,
  user: db_uri.user,
  password: db_uri.password,
  dbname: db_uri.path.delete_prefix('/')
)
DB.type_map_for_results = PG::BasicTypeMapForResults.new(DB)

DB.exec(<<~SQL)
  CREATE TABLE IF NOT EXISTS feeds (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT,
    source_type TEXT NOT NULL DEFAULT 'rss' CHECK (source_type IN ('rss', 'google_alert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    term TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_vector TSVECTOR GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
    ) STORED,
    UNIQUE (feed_id, url)
  );

  CREATE INDEX IF NOT EXISTS articles_search_vector_idx ON articles USING GIN (search_vector);
SQL

def parse_json_body(request)
  JSON.parse(request.body.read)
rescue JSON::ParserError
  halt 400, { error: 'Invalid JSON body' }.to_json
end

get '/health' do
  content_type :text
  'ok'
end

# Feeds

get '/api/feeds' do
  content_type :json
  DB.exec('SELECT * FROM feeds ORDER BY created_at DESC').to_a.to_json
end

post '/api/feeds' do
  content_type :json
  payload = parse_json_body(request)
  halt 400, { error: 'url is required' }.to_json if payload['url'].to_s.empty?

  result = DB.exec_params(
    'INSERT INTO feeds (url, name, source_type) VALUES ($1, $2, COALESCE($3, \'rss\')) RETURNING *',
    [payload['url'], payload['name'], payload['source_type']]
  )
  status 201
  result.first.to_json
end

delete '/api/feeds/:id' do
  DB.exec_params('DELETE FROM feeds WHERE id = $1', [params[:id]])
  status 204
end

# Keywords

get '/api/keywords' do
  content_type :json
  DB.exec('SELECT * FROM keywords ORDER BY created_at DESC').to_a.to_json
end

post '/api/keywords' do
  content_type :json
  payload = parse_json_body(request)
  halt 400, { error: 'term is required' }.to_json if payload['term'].to_s.empty?

  result = DB.exec_params(
    'INSERT INTO keywords (term) VALUES ($1) ON CONFLICT (term) DO NOTHING RETURNING *',
    [payload['term']]
  )
  status 201
  (result.first || { 'term' => payload['term'] }).to_json
end

delete '/api/keywords/:id' do
  DB.exec_params('DELETE FROM keywords WHERE id = $1', [params[:id]])
  status 204
end

# Articles

post '/api/articles' do
  content_type :json
  payload = parse_json_body(request)
  halt 400, { error: 'feed_id, title and url are required' }.to_json if payload['feed_id'].to_s.empty? || payload['title'].to_s.empty? || payload['url'].to_s.empty?

  result = DB.exec_params(<<~SQL, [payload['feed_id'], payload['title'], payload['url'], payload['summary'], payload['published_at']])
    INSERT INTO articles (feed_id, title, url, summary, published_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (feed_id, url) DO NOTHING
    RETURNING *
  SQL
  status 201
  (result.first || {}).to_json
end

# Returns articles matching any stored keyword. If no keywords are stored yet,
# returns all articles unfiltered.
get '/api/articles' do
  content_type :json
  keyword_count = DB.exec('SELECT count(*) FROM keywords').first['count'].to_i

  result = if keyword_count.zero?
             DB.exec('SELECT * FROM articles ORDER BY published_at DESC NULLS LAST')
           else
             DB.exec(<<~SQL)
               SELECT DISTINCT a.*
               FROM articles a
               JOIN keywords k ON a.search_vector @@ plainto_tsquery('english', k.term)
               ORDER BY a.published_at DESC NULLS LAST
             SQL
           end
  result.to_a.to_json
end
