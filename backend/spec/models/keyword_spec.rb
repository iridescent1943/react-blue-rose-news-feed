RSpec.describe Keyword do
  it 'keeps global keywords unique case-insensitively' do
    Keyword.create!(keyword: 'Ruby')

    expect(Keyword.new(keyword: 'ruby')).not_to be_valid
  end

  it 'allows the same keyword on a specific feed' do
    Keyword.create!(keyword: 'ruby')

    expect(Keyword.new(keyword: 'ruby', feed: create_feed)).to be_valid
  end
end
