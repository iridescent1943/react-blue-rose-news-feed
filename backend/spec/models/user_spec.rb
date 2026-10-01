RSpec.describe User do
  it 'normalizes email' do
    user = create_user(email: '  Admin@Example.COM ')

    expect(user.email).to eq('admin@example.com')
    expect(User.find_by_email(' ADMIN@example.com')).to eq(user)
  end

  describe '#authenticate' do
    let(:user) { create_user(password: 'secret123') }

    it 'accepts the correct password' do
      expect(user.authenticate('secret123')).to be_truthy
    end

    it 'rejects a wrong password' do
      expect(user.authenticate('wrong')).to be false
    end
  end

  it 'hides password_hash from JSON' do
    json = create_user.as_json

    expect(json).not_to have_key('password_hash')
    expect(json['email']).to eq('admin@example.com')
  end

  it 'rejects an unknown role' do
    user = User.new(email: 'a@example.com', password: 'x', role: 'root')

    expect(user).not_to be_valid
    expect(user.errors[:role]).to include('is not included in the list')
  end

  describe '.owner' do
    it 'returns the admin user' do
      create_user(email: 'guest@example.com', role: 'guest')
      admin = create_user

      expect(User.owner).to eq(admin)
    end
  end
end
