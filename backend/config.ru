require_relative 'config/environment'

production = ApplicationController.production?

use Rack::Session::Cookie,
  key: 'rack.session',
  secret: ENV.fetch('SESSION_SECRET'),
  httponly: true,
  same_site: production ? :none : :lax,
  secure: production

controllers = ApplicationController.descendants
controllers.each { |controller| use controller }

run ApplicationController
