require_relative '../helpers/json_helper'
require_relative '../helpers/auth_helper'

class ApplicationController < Sinatra::Base
  set :session_secret, ENV.fetch('SESSION_SECRET')
  set :sessions, httponly: true, same_site: :lax, secure: production?

  helpers JsonHelper
  helpers AuthHelper

  before do
    content_type :json
  end
end
