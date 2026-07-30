class Feed
  def self.all
    DB.exec('SELECT * FROM feeds ORDER BY created_at DESC').to_a
  end

  def self.create(url:, name:, source_type:)
    DB.exec_params(
      'INSERT INTO feeds (url, name, source_type) VALUES ($1, $2, COALESCE($3, \'rss\')) RETURNING *',
      [url, name, source_type]
    ).first
  end

  def self.delete(id)
    DB.exec_params('DELETE FROM feeds WHERE id = $1', [id])
  end
end
