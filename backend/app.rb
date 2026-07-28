require 'sinatra'
require 'json'
require 'mysql2'
require 'uri'

set :bind, '0.0.0.0'
set :port, ENV.fetch('PORT', 3000)

db_uri = URI.parse(ENV.fetch('DATABASE_URL'))
DB = Mysql2::Client.new(
  host: db_uri.host,
  port: db_uri.port || 3306,
  username: db_uri.user,
  password: db_uri.password,
  database: db_uri.path.delete_prefix('/')
)

DB.query(<<~SQL)
  CREATE TABLE IF NOT EXISTS store (
    `key` VARCHAR(255) PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
SQL

get '/health' do
  content_type :text
  'ok'
end

get '/api/store/:key' do
  content_type :json
  stmt = DB.prepare('SELECT value FROM store WHERE `key` = ?')
  result = stmt.execute(params[:key])
  row = result.first
  halt 404 if row.nil?
  row['value']
end

put '/api/store/:key' do
  begin
    payload = JSON.parse(request.body.read)
  rescue JSON::ParserError
    halt 400, { error: 'Invalid JSON body' }.to_json
  end

  stmt = DB.prepare(<<~SQL)
    INSERT INTO store (`key`, value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE value = VALUES(value)
  SQL
  stmt.execute(params[:key], payload.to_json)
  status 204
end
