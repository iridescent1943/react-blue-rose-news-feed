require 'sinatra/base'
require_relative '../helpers/json_helpers'
require_relative '../models/article'
require_relative '../models/keyword'

class ArticlesController < Sinatra::Base
  helpers JsonHelpers

  post '/api/articles' do
    content_type :json
    payload = parse_json_body(request)
    if payload['feed_id'].to_s.empty? || payload['title'].to_s.empty? || payload['url'].to_s.empty?
      halt 400, { error: 'feed_id, title and url are required' }.to_json
    end

    result = Article.create(
      feed_id: payload['feed_id'],
      title: payload['title'],
      url: payload['url'],
      summary: payload['summary'],
      published_at: payload['published_at']
    )
    status 201
    (result || {}).to_json
  end

  # Returns articles matching any stored keyword. If no keywords are stored yet,
  # returns all articles unfiltered.
  get '/api/articles' do
    content_type :json
    result = Keyword.count.zero? ? Article.all : Article.matching_keywords
    result.to_json
  end
end
