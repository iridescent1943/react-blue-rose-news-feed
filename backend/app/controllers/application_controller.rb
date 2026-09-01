require_relative '../helpers/json_helper'
require_relative '../helpers/auth_helper'

class ApplicationController < Sinatra::Base
  helpers JsonHelper
  helpers AuthHelper

  allowed_origins = ENV.fetch('ALLOWED_ORIGINS', '').split(',').map(&:strip).reject(&:empty?)

  configure do
    use Rack::Cors do
      allow do
        origins(*allowed_origins)
        resource '/api/*', headers: :any, credentials: true,
                            methods: %i[get post put patch delete options]
      end
    end

    set :protection, permitted_origins: allowed_origins
  end

  before do
    content_type :json
  end
end
