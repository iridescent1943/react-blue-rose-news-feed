require_relative 'config/environment'

use Rack::Session::Cookie,
  key: 'rack.session',
  secret: ENV.fetch('SESSION_SECRET'),
  httponly: true,
  same_site: :lax,
  secure: ENV.fetch('RACK_ENV', 'development') == 'production'

controllers = ApplicationController.descendants
controllers.each { |controller| use controller }

run ApplicationController
