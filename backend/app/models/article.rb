class Article < ActiveRecord::Base
  self.primary_key = 'article_id'

  default_scope { order(Arel.sql('published_at DESC NULLS LAST')) }

  belongs_to :feed, foreign_key: 'feed_id', inverse_of: :articles

  validates :guid, presence: true, uniqueness: { scope: :feed_id }
  validates :title, presence: true
  validates :link, presence: true

  def self.with_state(user_id = nil)
    select('articles.*, article_states.is_read, article_states.is_saved')
      .joins(sanitize_sql_array([
               'LEFT JOIN article_states ON article_states.article_id = articles.article_id ' \
               'AND article_states.user_id = ?', user_id
             ]))
  end

  def self.matching_keywords(user_id = nil)
    with_state(user_id)
      .joins("INNER JOIN keywords k ON search_vector @@ plainto_tsquery('english', k.keyword)")
      .distinct
  end
end
