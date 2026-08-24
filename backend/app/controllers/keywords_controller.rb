class KeywordsController < ApplicationController
  get '/api/keywords' do
    json_response(200, Keyword.all)
  end

  post '/api/keywords' do
    require_admin!
    payload = parse_json_body(request)
    halt_error(400, 'keyword is required') if payload['keyword'].to_s.empty?

    keyword = Keyword.new(keyword: payload['keyword'], feed_id: payload['feed_id'])
    if keyword.save
      json_response(201, keyword)
    else
      halt_error(422, keyword.errors.full_messages.join(', '))
    end
  end

  delete '/api/keywords/:id' do
    require_admin!
    keyword = Keyword.find_by(keyword_id: params[:id])
    halt_error(404, 'Keyword not found') unless keyword

    keyword.destroy
    status 204
  end
end
