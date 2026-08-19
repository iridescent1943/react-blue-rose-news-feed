class Note < ActiveRecord::Base
  self.primary_key = 'note_id'

  default_scope { order(created_at: :desc) }
  scope :active, -> { where(deleted_at: nil) }

  belongs_to :article, foreign_key: 'article_id'
  belongs_to :user, foreign_key: 'user_id'

  validates :content, presence: true
end
