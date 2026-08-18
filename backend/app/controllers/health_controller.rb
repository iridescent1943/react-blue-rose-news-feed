class HealthController < ApplicationController
  get '/health' do
    content_type :text
    'ok'
  end
end
