RSpec.describe Note do
  it 'excludes soft-deleted notes from .active' do
    user = create_user
    article = create_article
    active = Note.create!(user: user, article: article, content: 'active')
    Note.create!(user: user, article: article, content: 'inactive', deleted_at: Time.current)

    expect(Note.active.to_a).to eq([active])
  end

  it 'requires content' do
    expect(Note.new(user: create_user, article: create_article, content: '')).not_to be_valid
  end
end
