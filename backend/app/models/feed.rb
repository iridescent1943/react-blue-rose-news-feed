class Feed < ActiveRecord::Base
  self.primary_key = 'feed_id'

  default_scope { order(created_at: :desc) }

  has_many :articles, foreign_key: 'feed_id', inverse_of: :feed
  has_many :keywords, foreign_key: 'feed_id', inverse_of: :feed

  before_validation :normalize_feed_url

  validates :feed_url, presence: true
  validates :normalized_feed_url, presence: true, uniqueness: true
  validates :source_type, inclusion: { in: %w[rss google_alert] }
  validates :status, inclusion: { in: %w[active paused error] }

  def mark_fetched!(error: nil)
    update!(last_fetched_at: Time.current, status: error ? 'error' : 'active', last_error: error)
  end

  private

  def normalize_feed_url
    return if feed_url.blank?

    uri = URI.parse(feed_url.strip)
    uri.scheme = uri.scheme&.downcase
    uri.host = uri.host&.downcase
    self.normalized_feed_url = uri.to_s.sub(%r{/+\z}, '')
  rescue URI::InvalidURIError
    self.normalized_feed_url = feed_url.strip.sub(%r{/+\z}, '')
  end
end
