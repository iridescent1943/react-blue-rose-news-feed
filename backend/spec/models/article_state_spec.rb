RSpec.describe ArticleState do
  let(:state) { ArticleState.new(user: create_user, article: create_article) }

  describe '#mark_read!' do
    it 'sets and clears read_at' do
      state.mark_read!
      expect(state.reload).to have_attributes(is_read: true, read_at: be_present)

      state.mark_read!(false)
      expect(state.reload).to have_attributes(is_read: false, read_at: nil)
    end
  end

  describe '#mark_saved!' do
    it 'sets and clears saved_at' do
      state.mark_saved!
      expect(state.reload).to have_attributes(is_saved: true, saved_at: be_present)

      state.mark_saved!(false)
      expect(state.reload).to have_attributes(is_saved: false, saved_at: nil)
    end
  end
end
