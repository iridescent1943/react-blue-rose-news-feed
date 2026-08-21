require_relative '../helpers/json_helper'

class ApplicationController < Sinatra::Base
  helpers JsonHelper

  before do
    content_type :json
  end
end
