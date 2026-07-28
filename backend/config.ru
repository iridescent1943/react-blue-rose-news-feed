require 'rack/cors'
require './app'

use Rack::Cors do
  allow do
    origins ENV.fetch('CORS_ORIGIN', '*')
    resource '/*', headers: :any, methods: %i[get put options]
  end
end

run Sinatra::Application
