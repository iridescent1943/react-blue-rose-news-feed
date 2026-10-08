module Factories
  def create_user(email: 'admin@example.com', password: 'secret123', role: 'admin')
    User.create!(email: email, password: password, role: role)
  end

  def create_feed(feed_url: 'https://example.com/feed.xml', **attrs)
    Feed.create!({ feed_url: feed_url, title: "Feed #{feed_url}", last_fetched_at: Time.current }.merge(attrs))
  end

  def create_article(feed: create_feed, **attrs)
    defaults = { guid: SecureRandom.uuid, title: 'Title', link: 'https://example.com/a', published_at: Time.current }
    Article.create!(defaults.merge(feed: feed).merge(attrs))
  end
end
