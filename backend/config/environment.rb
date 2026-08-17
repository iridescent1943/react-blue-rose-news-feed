# load all gems in the Gemfile
require 'bundler/setup'
Bundler.require(:default, ENV['RACK_ENV'] || :development)

# Load all application components
Dir[File.expand_path('../../app/**/*.rb', __FILE__)].each do |file|
  require file
end

# Database setup using ActiveRecord
ActiveRecord.schema_format = :sql
db_config_file = File.expand_path('../config/database.yml', __dir__)
db_config = YAML.safe_load(ERB.new(File.read(db_config_file)).result, aliases: true)
env = ENV['RACK_ENV'] || 'development'
default_db = db_config[env]
ActiveRecord::Base.establish_connection(default_db)
