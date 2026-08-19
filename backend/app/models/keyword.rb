class Keyword < ActiveRecord::Base
  self.primary_key = 'keyword_id'

  default_scope { order(created_at: :desc) }

  belongs_to :feed, foreign_key: 'feed_id', inverse_of: :keywords, optional: true

  validates :keyword, presence: true, uniqueness: { scope: :feed_id, case_sensitive: false }
end
