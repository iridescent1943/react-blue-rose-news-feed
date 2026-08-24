class SessionsController < ApplicationController
  post '/api/login' do
    payload = parse_json_body(request)
    user = User.find_by_email(payload['email'].to_s)

    if user&.role == 'admin' && user.authenticate(payload['password'].to_s)
      session[:user_id] = user.user_id
      json_response(200, user)
    else
      halt_error(401, 'Invalid email or password')
    end
  end

  delete '/api/session' do
    session.clear
    status 204
  end

  get '/api/session' do
    json_response(200, { authenticated: !current_user.nil?, user: current_user })
  end
end
