class Article
  def self.create(feed_id:, title:, url:, summary:, published_at:)
    DB.exec_params(<<~SQL, [feed_id, title, url, summary, published_at]).first
      INSERT INTO articles (feed_id, title, url, summary, published_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (feed_id, url) DO NOTHING
      RETURNING *
    SQL
  end

  def self.all
    DB.exec('SELECT * FROM articles ORDER BY published_at DESC NULLS LAST').to_a
  end

  # Articles matching any stored keyword via full-text search.
  def self.matching_keywords
    DB.exec(<<~SQL).to_a
      SELECT DISTINCT a.*
      FROM articles a
      JOIN keywords k ON a.search_vector @@ plainto_tsquery('english', k.term)
      ORDER BY a.published_at DESC NULLS LAST
    SQL
  end
end
