RSpec.describe 'Sessions API' do
  describe 'POST /api/login' do
    it 'logs in an admin with valid credentials' do
      create_user
      post_json '/api/login', email: ' ADMIN@example.com ', password: 'secret123'

      expect(last_response.status).to eq(200)
      expect(json_body.dig('data', 'email')).to eq('admin@example.com')
      expect(json_body['data']).not_to have_key('password_hash')
    end

    it 'rejects a wrong password' do
      create_user
      post_json '/api/login', email: 'admin@example.com', password: 'nope'

      expect(last_response.status).to eq(401)
      expect(json_body['error']).to eq('Invalid email or password')
    end

    it 'rejects a guest user' do
      create_user(email: 'guest@example.com', role: 'guest')
      post_json '/api/login', email: 'guest@example.com', password: 'secret123'

      expect(last_response.status).to eq(401)
    end

    it 'requires a JSON content type' do
      post '/api/login', 'email=a', 'CONTENT_TYPE' => 'application/x-www-form-urlencoded'

      expect(last_response.status).to eq(415)
    end

    it 'rejects malformed JSON' do
      post '/api/login', '{not json', 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(400)
      expect(json_body['error']).to eq('Invalid JSON body')
    end
  end

  describe 'GET /api/session' do
    it 'reports logged out by default' do
      get '/api/session'

      expect(json_body['data']).to eq('authenticated' => false, 'user' => nil)
    end

    it 'reports the logged-in user' do
      login_as_admin
      get '/api/session'

      expect(json_body.dig('data', 'authenticated')).to be true
      expect(json_body.dig('data', 'user', 'email')).to eq('admin@example.com')
    end
  end

  describe 'DELETE /api/session' do
    it 'logs out' do
      login_as_admin
      delete '/api/session'
      expect(last_response.status).to eq(204)

      get '/api/session'
      expect(json_body.dig('data', 'authenticated')).to be false
    end
  end
end
