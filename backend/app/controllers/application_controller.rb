require_relative '../helpers/json_helper'

class ApplicationController < Sinatra::Base
  helpers JsonHelper
end
