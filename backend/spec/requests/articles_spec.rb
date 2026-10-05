RSpec.describe 'Articles API' do
  let(:feed) { create_feed }

  describe 'GET /api/articles' do
    it "includes the owner's read/saved state" do
      admin = create_user
      article = create_article(feed: feed, title: 'Hello')
      ArticleState.create!(user: admin, article: article, is_saved: true)

      get '/api/articles'

      expect(last_response.status).to eq(200)
      expect(json_body['data'].sole).to include('title' => 'Hello', 'is_saved' => true)
    end

    it 'filters by keywords' do
      create_article(feed: feed, title: 'Ruby release')
      create_article(feed: feed, title: 'Gardening tips')
      Keyword.create!(keyword: 'ruby')

      get '/api/articles'

      expect(json_body['data'].map { |a| a['title'] }).to eq(['Ruby release'])
    end

    it 'refreshes only stale, active feeds' do
      stale = create_feed(feed_url: 'https://stale.com/rss', last_fetched_at: 1.hour.ago)
      create_feed(feed_url: 'https://paused.com/rss', last_fetched_at: nil, status: 'paused')
      create_feed(feed_url: 'https://fresh.com/rss', last_fetched_at: 1.minute.ago)
      stub_request(:get, 'https://stale.com/rss').to_return(status: 500)

      get '/api/articles'

      expect(last_response.status).to eq(200)
      expect(a_request(:get, 'https://stale.com/rss')).to have_been_made.once
      expect(a_request(:get, 'https://paused.com/rss')).not_to have_been_made
      expect(a_request(:get, 'https://fresh.com/rss')).not_to have_been_made
      expect(stale.reload.status).to eq('error')
    end
  end

  describe 'POST /api/articles/:id/summarize' do
    let(:article) { create_article(feed: feed, content_text: 'Body') }

    it 'returns the summary' do
      allow(GeminiSummarizer).to receive(:summarize).with('Body')
                                                    .and_return(GeminiSummarizer::Result.new('Summary.', 'gemini-test'))

      post "/api/articles/#{article.article_id}/summarize"

      expect(last_response.status).to eq(200)
      expect(json_body['data']).to eq('summary' => 'Summary.', 'model' => 'gemini-test')
    end

    it 'returns 429 when rate limited' do
      allow(GeminiSummarizer).to receive(:summarize).and_raise(GeminiSummarizer::RateLimitedError)

      post "/api/articles/#{article.article_id}/summarize"

      expect(last_response.status).to eq(429)
    end

    it 'returns 502 on other summarizer errors' do
      allow(GeminiSummarizer).to receive(:summarize).and_raise(GeminiSummarizer::Error)

      post "/api/articles/#{article.article_id}/summarize"

      expect(last_response.status).to eq(502)
    end

    it 'returns 404 for a missing article' do
      post '/api/articles/0/summarize'

      expect(last_response.status).to eq(404)
    end
  end

  describe 'PATCH /api/articles/:id/state' do
    let(:article) { create_article(feed: feed) }

    it 'requires admin' do
      patch_json "/api/articles/#{article.article_id}/state", is_read: true

      expect(last_response.status).to eq(401)
    end

    context 'as admin' do
      let!(:admin) { login_as_admin }

      it 'updates read and saved flags independently' do
        patch_json "/api/articles/#{article.article_id}/state", is_read: true, is_saved: true
        expect(last_response.status).to eq(200)
        state = ArticleState.find([admin.user_id, article.article_id])
        expect(state).to have_attributes(is_read: true, is_saved: true)

        patch_json "/api/articles/#{article.article_id}/state", is_read: false
        expect(state.reload).to have_attributes(is_read: false, is_saved: true)
      end

      it 'requires is_read or is_saved' do
        patch_json "/api/articles/#{article.article_id}/state", {}

        expect(last_response.status).to eq(400)
      end

      it 'returns 404 for a missing article' do
        patch_json '/api/articles/0/state', is_read: true

        expect(last_response.status).to eq(404)
      end
    end
  end
end
