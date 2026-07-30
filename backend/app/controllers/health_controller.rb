require 'sinatra/base'

class HealthController < Sinatra::Base
  get '/health' do
    content_type :text
    'ok'
  end
end
