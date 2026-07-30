class Keyword
  def self.all
    DB.exec('SELECT * FROM keywords ORDER BY created_at DESC').to_a
  end

  def self.create(term:)
    DB.exec_params(
      'INSERT INTO keywords (term) VALUES ($1) ON CONFLICT (term) DO NOTHING RETURNING *',
      [term]
    ).first
  end

  def self.delete(id)
    DB.exec_params('DELETE FROM keywords WHERE id = $1', [id])
  end

  def self.count
    DB.exec('SELECT count(*) FROM keywords').first['count'].to_i
  end
end
