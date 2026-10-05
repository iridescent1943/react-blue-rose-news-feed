RSpec.describe 'Notes API' do
  let(:article) { create_article }

  it 'lists active notes for an article' do
    user = create_user
    other = create_article(feed: article.feed)
    Note.create!(user: user, article: article, content: 'mine')
    Note.create!(user: user, article: other, content: 'other')
    Note.create!(user: user, article: article, content: 'gone', deleted_at: Time.current)

    get '/api/notes', article_id: article.article_id

    expect(json_body['data'].map { |n| n['content'] }).to eq(['mine'])
  end

  describe 'POST /api/notes' do
    it 'requires admin' do
      post_json '/api/notes', article_id: article.article_id, content: 'x'

      expect(last_response.status).to eq(401)
    end

    context 'as admin' do
      let!(:admin) { login_as_admin }

      it 'creates a note owned by the admin' do
        post_json '/api/notes', article_id: article.article_id, content: 'Interesting'

        expect(last_response.status).to eq(201)
        expect(json_body.dig('data', 'user_id')).to eq(admin.user_id)
      end

      it 'requires article_id and content' do
        post_json '/api/notes', content: 'x'
        expect(last_response.status).to eq(400)

        post_json '/api/notes', article_id: article.article_id
        expect(last_response.status).to eq(400)
      end
    end
  end

  context 'with an existing note' do
    let!(:admin) { login_as_admin }
    let(:note) { Note.create!(user: admin, article: article, content: 'old') }

    it 'updates the content' do
      patch_json "/api/notes/#{note.note_id}", content: 'new'

      expect(last_response.status).to eq(200)
      expect(note.reload.content).to eq('new')
    end

    it 'rejects empty content' do
      patch_json "/api/notes/#{note.note_id}", content: ''

      expect(last_response.status).to eq(422)
    end

    it 'soft-deletes, after which the note is not found' do
      delete "/api/notes/#{note.note_id}"
      expect(last_response.status).to eq(204)
      expect(note.reload.deleted_at).not_to be_nil

      patch_json "/api/notes/#{note.note_id}", content: 'revive'
      expect(last_response.status).to eq(404)
    end
  end
end
