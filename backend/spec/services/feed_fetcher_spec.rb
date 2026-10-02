RSpec.describe FeedFetcher do
  let(:feed_url) { 'https://example.com/feed.xml' }

  let(:rss) do
    <<~XML
      <?xml version="1.0"?>
      <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
        <channel>
          <title>Example</title>
          <item>
            <title>First post</title>
            <link>https://example.com/first</link>
            <guid>first-guid</guid>
            <pubDate>Mon, 21 Sep 2026 10:00:00 GMT</pubDate>
            <description><![CDATA[<p onclick="x()">Hello <script>alert(1)</script><a href="javascript:evil()">bad</a> <a href="https://ok.com" target="_blank">good</a><u>under</u></p>]]></description>
            <media:thumbnail url="https://example.com/thumb.jpg"/>
          </item>
          <item>
            <title>No guid</title>
            <link>https://example.com/second</link>
          </item>
          <item>
            <title>No link</title>
          </item>
        </channel>
      </rss>
    XML
  end

  let(:atom) do
    <<~XML
      <?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Atom entry</title>
          <link href="https://example.com/atom-entry"/>
          <updated>2026-09-20T08:00:00Z</updated>
          <summary>Atom summary</summary>
        </entry>
      </feed>
    XML
  end

  let(:feed) { create_feed(feed_url: feed_url, last_fetched_at: nil) }

  context 'with an RSS feed' do
    before { stub_request(:get, feed_url).to_return(body: rss) }

    it 'imports items that have a link' do
      expect(FeedFetcher.fetch!(feed)).to be true

      expect(feed.articles.count).to eq(2)
      expect(feed.articles.find_by!(guid: 'first-guid')).to have_attributes(
        title: 'First post',
        link: 'https://example.com/first',
        published_at: Time.utc(2026, 9, 21, 10),
        thumbnail_url: 'https://example.com/thumb.jpg'
      )
      expect(feed.reload.status).to eq('active')
      expect(feed.last_fetched_at).not_to be_nil
    end

    it 'falls back to the link when guid is missing' do
      FeedFetcher.fetch!(feed)

      expect(feed.articles.find_by!(link: 'https://example.com/second').guid).to eq('https://example.com/second')
    end

    it 'sanitizes HTML and extracts plain text' do
      FeedFetcher.fetch!(feed)
      article = feed.articles.find_by!(guid: 'first-guid')

      expect(article.content_html)
        .to include('<a href="https://ok.com">good</a>', 'under')
        .and not_include('<script', 'onclick', 'javascript:', 'target=', '<u>')
      expect(article.content_text).to eq('Hello bad goodunder')
    end

    it 'updates existing articles instead of duplicating them' do
      2.times { FeedFetcher.fetch!(feed) }

      expect(feed.articles.count).to eq(2)
    end
  end

  it 'imports Atom entries' do
    stub_request(:get, feed_url).to_return(body: atom)

    expect(FeedFetcher.fetch!(feed)).to be true
    expect(feed.articles.sole).to have_attributes(
      title: 'Atom entry',
      link: 'https://example.com/atom-entry',
      content_text: 'Atom summary',
      published_at: Time.utc(2026, 9, 20, 8)
    )
  end

  it 'follows redirects' do
    stub_request(:get, feed_url).to_return(status: 301, headers: { 'Location' => '/moved.xml' })
    stub_request(:get, 'https://example.com/moved.xml').to_return(body: atom)

    expect(FeedFetcher.fetch!(feed)).to be true
    expect(feed.articles.count).to eq(1)
  end

  describe 'failures' do
    it 'gives up after too many redirects' do
      stub_request(:get, feed_url).to_return(status: 302, headers: { 'Location' => feed_url })

      expect(FeedFetcher.fetch!(feed)).to be false
      expect(feed.reload.last_error).to eq('Too many redirects')
    end

    it 'marks the feed as errored on HTTP failure' do
      stub_request(:get, feed_url).to_return(status: 500)

      expect(FeedFetcher.fetch!(feed)).to be false
      expect(feed.reload).to have_attributes(status: 'error', last_error: 'HTTP 500', last_fetched_at: be_present)
    end

    it 'marks the feed as errored when there are no items' do
      stub_request(:get, feed_url).to_return(body: '<rss><channel></channel></rss>')

      expect(FeedFetcher.fetch!(feed)).to be false
      expect(feed.reload.last_error).to eq('No RSS items or Atom entries found')
    end

    it 'marks the feed as errored on malformed XML' do
      stub_request(:get, feed_url).to_return(body: '<rss><channel><item>')

      expect(FeedFetcher.fetch!(feed)).to be false
      expect(feed.reload.status).to eq('error')
    end

    it 'rejects non-HTTP schemes' do
      feed.update!(feed_url: 'file:///etc/passwd')

      expect(FeedFetcher.fetch!(feed)).to be false
      expect(feed.reload.last_error).to eq('Unsupported URL scheme: file')
    end
  end
end
