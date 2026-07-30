require 'rack/cascade'
require_relative '../../config/environment'
require_relative 'health_controller'
require_relative 'feeds_controller'
require_relative 'keywords_controller'
require_relative 'articles_controller'

ApplicationController = Rack::Cascade.new([
  HealthController,
  FeedsController,
  KeywordsController,
  ArticlesController,
])
