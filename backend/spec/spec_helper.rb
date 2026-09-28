ENV['RACK_ENV'] = 'test'
ENV['SESSION_SECRET'] ||= 'test-session-secret-' + ('x' * 64)
ENV['ALLOWED_ORIGINS'] = 'http://example.org'
ENV['GEMINI_API_KEY'] = 'test-gemini-key'

require_relative '../config/environment'
require 'rack/test'
require 'webmock/rspec'

Dir[File.expand_path('support/**/*.rb', __dir__)].each { |file| require file }

TestDatabase.prepare!
BCrypt::Engine.cost = BCrypt::Engine::MIN_COST

RSpec.configure do |config|
  config.include Factories
  config.include RequestHelpers, type: :request

  config.define_derived_metadata(file_path: %r{/spec/requests/}) do |metadata|
    metadata[:type] = :request
  end

  config.around do |example|
    ActiveRecord::Base.connection.transaction(joinable: false) do
      example.run
      raise ActiveRecord::Rollback
    end
  end

  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end
