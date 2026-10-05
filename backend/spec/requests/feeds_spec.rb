RSpec.describe 'Feeds API' do
  describe 'GET /api/feeds' do
    it 'paginates with limit and offset' do
      3.times { |i| create_feed(feed_url: "https://example.com/#{i}") }

      get '/api/feeds', limit: 2
      expect(json_body['data'].size).to eq(2)

      get '/api/feeds', limit: 2, offset: 2
      expect(json_body['data'].size).to eq(1)
    end

    it 'accepts out-of-range limit and offset' do
      get '/api/feeds', limit: 1000, offset: -5

      expect(last_response.status).to eq(200)
    end
  end

  describe 'POST /api/feeds' do
    it 'requires admin' do
      post_json '/api/feeds', feed_url: 'https://example.com/rss'

      expect(last_response.status).to eq(401)
      expect(Feed.count).to eq(0)
    end

    context 'as admin' do
      before { login_as_admin }

      it 'creates a feed' do
        post_json '/api/feeds', feed_url: 'https://Example.com/rss/', title: 'Example'

        expect(last_response.status).to eq(201)
        expect(json_body['data']).to include('normalized_feed_url' => 'https://example.com/rss', 'source_type' => 'rss')
      end

      it 'requires feed_url' do
        post_json '/api/feeds', title: 'No url'

        expect(last_response.status).to eq(400)
      end

      it 'rejects a duplicate' do
        create_feed(feed_url: 'https://example.com/rss')
        post_json '/api/feeds', feed_url: 'https://example.com/rss/'

        expect(last_response.status).to eq(422)
        expect(json_body['error']).to match(/already been taken/)
      end
    end
  end

  describe 'PATCH /api/feeds/:id' do
    let(:feed) { create_feed }

    before { login_as_admin }

    it 'updates the status' do
      patch_json "/api/feeds/#{feed.feed_id}", status: 'paused'

      expect(last_response.status).to eq(200)
      expect(feed.reload.status).to eq('paused')
    end

    it 'rejects an invalid status' do
      patch_json "/api/feeds/#{feed.feed_id}", status: 'bogus'

      expect(last_response.status).to eq(422)
    end

    it 'returns 404 for a missing feed' do
      patch_json '/api/feeds/0', status: 'paused'

      expect(last_response.status).to eq(404)
    end
  end

  describe 'DELETE /api/feeds/:id' do
    let!(:feed) { create_feed }

    it 'requires admin' do
      delete "/api/feeds/#{feed.feed_id}"

      expect(last_response.status).to eq(401)
      expect(Feed.exists?(feed.feed_id)).to be true
    end

    it 'deletes the feed and its articles' do
      create_article(feed: feed)
      login_as_admin

      delete "/api/feeds/#{feed.feed_id}"

      expect(last_response.status).to eq(204)
      expect(Feed.count).to eq(0)
      expect(Article.count).to eq(0)
    end
  end
end
