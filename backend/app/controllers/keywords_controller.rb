require 'sinatra/base'
require_relative '../helpers/json_helpers'
require_relative '../models/keyword'

class KeywordsController < Sinatra::Base
  helpers JsonHelpers

  get '/api/keywords' do
    content_type :json
    Keyword.all.to_json
  end

  post '/api/keywords' do
    content_type :json
    payload = parse_json_body(request)
    halt 400, { error: 'term is required' }.to_json if payload['term'].to_s.empty?

    result = Keyword.create(term: payload['term'])
    status 201
    (result || { 'term' => payload['term'] }).to_json
  end

  delete '/api/keywords/:id' do
    Keyword.delete(params[:id])
    status 204
  end
end
