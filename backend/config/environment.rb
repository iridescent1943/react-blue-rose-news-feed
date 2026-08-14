require 'erb'
require 'json'
require 'pg'
require 'uri'
require 'yaml'

RACK_ENV = ENV.fetch('RACK_ENV', 'development')

def database_config
  if ENV['DATABASE_URL']
    db_uri = URI.parse(ENV['DATABASE_URL'])
    {
      host: db_uri.host,
      port: db_uri.port || 5432,
      user: db_uri.user,
      password: db_uri.password,
      dbname: db_uri.path.delete_prefix('/'),
    }
  else
    raw = ERB.new(File.read(File.join(__dir__, 'database.yml'))).result
    config = YAML.load(raw)
    config.fetch(RACK_ENV).transform_keys(&:to_sym)
  end
end

DB = PG::Connection.new(**database_config)
DB.type_map_for_results = PG::BasicTypeMapForResults.new(DB)
DB.exec(File.read(File.join(__dir__, '..', 'db', 'schema.sql')))
