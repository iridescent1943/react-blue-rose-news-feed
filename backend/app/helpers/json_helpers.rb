module JsonHelpers
  def parse_json_body(request)
    JSON.parse(request.body.read)
  rescue JSON::ParserError
    halt 400, { error: 'Invalid JSON body' }.to_json
  end
end
