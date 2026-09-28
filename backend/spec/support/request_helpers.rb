module RequestHelpers
  include Rack::Test::Methods

  APP = Rack::Builder.parse_file(File.expand_path('../../config.ru', __dir__))

  def app
    APP
  end

  def json_body
    JSON.parse(last_response.body)
  end

  def post_json(path, payload)
    post path, payload.to_json, 'CONTENT_TYPE' => 'application/json'
  end

  def patch_json(path, payload)
    patch path, payload.to_json, 'CONTENT_TYPE' => 'application/json'
  end

  def login_as_admin
    user = create_user
    post_json '/api/login', email: user.email, password: 'secret123'
    raise "admin login failed: #{last_response.status}" unless last_response.status == 200

    user
  end
end
