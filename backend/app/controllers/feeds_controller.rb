class FeedsController < ApplicationController
  get '/api/feeds' do
    content_type :json
    Feed.all.to_json
  end

  post '/api/feeds' do
    content_type :json
    payload = parse_json_body(request)
    halt 400, { error: 'url is required' }.to_json if payload['url'].to_s.empty?

    result = Feed.create(url: payload['url'], name: payload['name'], source_type: payload['source_type'])
    status 201
    result.to_json
  end

  delete '/api/feeds/:id' do
    Feed.delete(params[:id])
    status 204
  end
end
