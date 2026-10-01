RSpec.describe Article do
  let(:feed) { create_feed }

  it 'orders newest first with undated articles last' do
    undated = create_article(feed: feed, published_at: nil)
    old = create_article(feed: feed, published_at: 2.days.ago)
    recent = create_article(feed: feed, published_at: 1.hour.ago)

    expect(Article.all.to_a).to eq([recent, old, undated])
  end

  it 'keeps guid unique per feed' do
    create_article(feed: feed, guid: 'abc')
    other_feed = create_feed(feed_url: 'https://other.com/rss')

    expect(Article.new(feed: feed, guid: 'abc', title: 't', link: 'l')).not_to be_valid
    expect(Article.new(feed: other_feed, guid: 'abc', title: 't', link: 'l')).to be_valid
  end

  describe '.with_state' do
    it "includes the admin's read/saved state" do
      admin = create_user
      article = create_article(feed: feed)
      ArticleState.create!(user: admin, article: article, is_read: true, is_saved: true)

      expect(Article.with_state(admin.user_id).sole).to have_attributes(is_read: true, is_saved: true)
    end

    it 'returns nil state for articles the admin has not touched' do
      admin = create_user
      create_article(feed: feed)

      expect(Article.with_state(admin.user_id).sole).to have_attributes(is_read: nil, is_saved: nil)
    end

    it 'returns nil state when there is no admin' do
      create_article(feed: feed)

      expect(Article.with_state(nil).sole).to have_attributes(is_read: nil, is_saved: nil)
    end
  end

  describe '.matching_keywords' do
    it 'filters by full-text search' do
      ruby = create_article(feed: feed, title: 'Ruby 4 released', content_text: 'New features')
      create_article(feed: feed, title: 'Python news', content_text: 'Unrelated')
      Keyword.create!(keyword: 'ruby')

      expect(Article.matching_keywords.to_a).to eq([ruby])
    end

    it 'uses stemming' do
      article = create_article(feed: feed, title: 'Markets are rallying')
      Keyword.create!(keyword: 'rally')

      expect(Article.matching_keywords.to_a).to eq([article])
    end

    it 'applies feed keywords only to their own feed' do
      other_feed = create_feed(feed_url: 'https://other.com/rss')
      Keyword.create!(keyword: 'ruby', feed: feed)
      create_article(feed: feed, title: 'Python news')
      unfiltered = create_article(feed: other_feed, title: 'Anything goes')

      expect(Article.matching_keywords.to_a).to eq([unfiltered])
    end

    it "includes the admin's state on matching articles" do
      admin = create_user
      article = create_article(feed: feed, title: 'Ruby 4 released')
      ArticleState.create!(user: admin, article: article, is_saved: true)
      Keyword.create!(keyword: 'ruby')

      expect(Article.matching_keywords(admin.user_id).sole).to have_attributes(is_saved: true)
    end
  end
end
