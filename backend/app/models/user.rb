class User < ActiveRecord::Base
  self.primary_key = 'user_id'

  before_validation :normalize_email

  validates :email, presence: true, uniqueness: true
  validates :password_hash, presence: true
  validates :role, inclusion: { in: %w[admin guest] }

  def self.owner
    find_by(role: 'admin')
  end

  def self.find_by_email(email)
    find_by(email: email.to_s.strip.downcase)
  end

  def password=(plain_password)
    self.password_hash = BCrypt::Password.create(plain_password)
  end

  def authenticate(plain_password)
    return false if password_hash.blank?

    BCrypt::Password.new(password_hash) == plain_password
  end

  def as_json(options = {})
    super(options.merge(except: Array(options[:except]) + ['password_hash']))
  end

  private

  def normalize_email
    self.email = email.strip.downcase if email.present?
  end
end
