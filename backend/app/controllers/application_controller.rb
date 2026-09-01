require_relative '../helpers/json_helper'
require_relative '../helpers/auth_helper'

class ApplicationController < Sinatra::Base
  helpers JsonHelper
  helpers AuthHelper

  before do
    content_type :json
  end
end
