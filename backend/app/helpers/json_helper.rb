module JsonHelper
  def parse_json_body(request)
    body = request.body.read
    request.body.rewind
    JSON.parse(body)
  rescue JSON::ParserError
    halt_error(400, 'Invalid JSON body')
  end

  def halt_error(status, message = nil, additional_info = {})
    halt(status, { error: message }.merge(additional_info).to_json)
  end

  def json_response(status, payload, additional_info = {})
    status status
    data = payload.respond_to?(:as_json) ? payload.as_json : payload
    { data: data }.merge(additional_info).to_json
  end
end
