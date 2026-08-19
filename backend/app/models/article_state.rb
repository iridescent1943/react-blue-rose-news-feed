class ArticleState < ActiveRecord::Base
  self.primary_key = [:user_id, :article_id]

  belongs_to :user, foreign_key: 'user_id'
  belongs_to :article, foreign_key: 'article_id'

  def mark_read!(read = true)
    update!(is_read: read, read_at: read ? Time.current : nil)
  end

  def mark_saved!(saved = true)
    update!(is_saved: saved, saved_at: saved ? Time.current : nil)
  end
end
