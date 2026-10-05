RSpec.describe 'Keywords API' do
  it 'lists keywords' do
    Keyword.create!(keyword: 'ruby')
    get '/api/keywords'

    expect(json_body['data'].map { |k| k['keyword'] }).to eq(['ruby'])
  end

  describe 'POST /api/keywords' do
    it 'requires admin' do
      post_json '/api/keywords', keyword: 'ruby'

      expect(last_response.status).to eq(401)
    end

    context 'as admin' do
      before { login_as_admin }

      it 'creates a feed-specific keyword' do
        feed = create_feed
        post_json '/api/keywords', keyword: 'ruby', feed_id: feed.feed_id

        expect(last_response.status).to eq(201)
        expect(json_body.dig('data', 'feed_id')).to eq(feed.feed_id)
      end

      it 'requires a keyword' do
        post_json '/api/keywords', keyword: ''

        expect(last_response.status).to eq(400)
      end

      it 'rejects a case-insensitive duplicate' do
        Keyword.create!(keyword: 'Ruby')
        post_json '/api/keywords', keyword: 'ruby'

        expect(last_response.status).to eq(422)
      end
    end
  end

  describe 'DELETE /api/keywords/:id' do
    it 'deletes the keyword, then returns 404' do
      keyword = Keyword.create!(keyword: 'ruby')
      login_as_admin

      delete "/api/keywords/#{keyword.keyword_id}"
      expect(last_response.status).to eq(204)
      expect(Keyword.count).to eq(0)

      delete "/api/keywords/#{keyword.keyword_id}"
      expect(last_response.status).to eq(404)
    end
  end
end
