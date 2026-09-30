module TestDatabase
  SCHEMA_PATH = File.expand_path('../../db/schema.sql', __dir__)

  def self.prepare!
    config = ActiveRecord::Base.connection_db_config.configuration_hash
    expected_db = ENV.fetch('TEST_DB_NAME')
    unless config[:database] == expected_db
      abort "Refusing to prepare #{config[:database].inspect}: expected TEST_DB_NAME #{expected_db.inspect}"
    end

    begin
      ActiveRecord::Base.connection.verify!
    rescue ActiveRecord::NoDatabaseError
      ActiveRecord::Base.establish_connection(config.merge(database: 'postgres'))
      ActiveRecord::Base.connection.create_database(config[:database])
      ActiveRecord::Base.establish_connection(config)
    end
    ActiveRecord::Base.connection.execute(File.read(SCHEMA_PATH))
  end
end
