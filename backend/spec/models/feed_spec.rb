RSpec.describe Feed do
  it 'normalizes the feed URL' do
    feed = create_feed(feed_url: ' HTTPS://Example.COM/Feed/// ')

    expect(feed.normalized_feed_url).to eq('https://example.com/Feed')
  end

  it 'rejects a duplicate normalized URL' do
    create_feed(feed_url: 'https://example.com/feed')
    dup = Feed.new(feed_url: 'HTTPS://EXAMPLE.com/feed/')

    expect(dup).not_to be_valid
    expect(dup.errors[:normalized_feed_url]).to include('has already been taken')
  end

  it 'rejects an invalid source_type and status' do
    feed = Feed.new(feed_url: 'https://example.com/feed', source_type: 'atom', status: 'broken')

    expect(feed).not_to be_valid
    expect(feed.errors[:source_type]).to be_present
    expect(feed.errors[:status]).to be_present
  end

  describe '#mark_fetched!' do
    let(:feed) { create_feed(last_fetched_at: nil) }

    it 'records an error' do
      feed.mark_fetched!(error: 'HTTP 500')

      expect(feed).to have_attributes(status: 'error', last_error: 'HTTP 500')
      expect(feed.last_fetched_at).not_to be_nil
    end

    it 'clears a previous error on success' do
      feed.mark_fetched!(error: 'HTTP 500')
      feed.mark_fetched!

      expect(feed).to have_attributes(status: 'active', last_error: nil)
    end
  end
end
