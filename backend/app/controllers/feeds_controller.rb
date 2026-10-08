class FeedsController < ApplicationController
  get '/api/feeds' do
    limit = params[:limit].to_i
    limit = 20 if limit <= 0
    limit = [limit, 100].min
    offset = [params[:offset].to_i, 0].max

    feeds = Feed.limit(limit).offset(offset)
    json_response(200, feeds)
  end

  post '/api/feeds' do
    require_admin!
    payload = parse_json_body(request)
    halt_error(400, 'feed_url is required') if payload['feed_url'].to_s.empty?
    halt_error(400, 'title is required') if payload['title'].to_s.strip.empty?

    feed = Feed.new(
      feed_url: payload['feed_url'],
      title: payload['title'],
      source_type: payload['source_type'].presence || 'rss'
    )
    if feed.save
      json_response(201, feed)
    else
      halt_error(422, feed.errors.full_messages.join(', '))
    end
  end

  patch '/api/feeds/:id' do
    require_admin!
    feed = Feed.find_by(feed_id: params[:id])
    halt_error(404, 'Feed not found') unless feed

    payload = parse_json_body(request)
    requested_changes = payload.slice('status', 'title')
    halt_error(400, 'status or title is required') if requested_changes.empty?

    if requested_changes.key?('title')
      requested_changes['title'] = requested_changes['title'].to_s.strip
      halt_error(400, 'title cannot be empty') if requested_changes['title'].empty?
    end

    if feed.update(requested_changes)
      json_response(200, feed)
    else
      halt_error(422, feed.errors.full_messages.join(', '))
    end
  end

  delete '/api/feeds/:id' do
    require_admin!
    feed = Feed.find_by(feed_id: params[:id])
    halt_error(404, 'Feed not found') unless feed

    feed.destroy
    status 204
  end
end
