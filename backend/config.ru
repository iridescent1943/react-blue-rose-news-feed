require 'rack/cors'
require './app/controllers/application_controller'

use Rack::Cors do
  allow do
    origins ENV.fetch('CORS_ORIGIN', '*')
    resource '/*', headers: :any, methods: %i[get put options]
  end
end

run ApplicationController
