require 'net/http'
require 'time'

class FeedFetcher
  USER_AGENT = 'BlueRoseNewsFeed/1.0'
  ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
  MAX_REDIRECTS = 5
  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 10
  MAX_ITEMS = 20

  TITLE_SELECTORS = ['title'].freeze
  DATE_SELECTORS = %w[pubDate date publicationDate published updated].freeze
  DESCRIPTION_SELECTORS = %w[description summary content encoded].freeze
  GUID_SELECTORS = ['guid'].freeze

  SAFE_TAGS = %w[a b strong i em p br ul ol li blockquote h1 h2 h3 h4 h5 h6 span div img].freeze
  UNSAFE_TAGS = %w[script style iframe object embed form svg math link meta].freeze
  SAFE_ATTRIBUTES = { 'a' => %w[href], 'img' => %w[src alt] }.freeze
  URL_ATTRIBUTES = %w[href src].freeze
  SAFE_URL_SCHEMES = %w[http https mailto].freeze

  def self.fetch!(feed)
    new(feed).call
  end

  def initialize(feed)
    @feed = feed
  end

  def call
    items = extract_items(parse(fetch_body(@feed.feed_url))).first(MAX_ITEMS)
    raise 'No RSS items or Atom entries found' if items.empty?

    items.filter_map { |item| upsert_article(item) }
         .each { |message| warn "[FeedFetcher] feed #{@feed.feed_id}: #{message}" }
    @feed.mark_fetched!
    true
  rescue StandardError => e
    @feed.mark_fetched!(error: e.message)
    false
  end

  private

  def fetch_body(url, redirects_left: MAX_REDIRECTS)
    raise 'Too many redirects' if redirects_left.negative?

    uri = URI.parse(url)
    raise "Unsupported URL scheme: #{uri.scheme}" unless %w[http https].include?(uri.scheme)

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https',
                                open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
      http.get(uri.request_uri, 'User-Agent' => USER_AGENT, 'Accept' => ACCEPT)
    end

    case response
    when Net::HTTPSuccess then response.body
    when Net::HTTPRedirection
      location = response['location']
      raise 'Redirect response missing Location header' if location.blank?

      fetch_body(URI.join(url, location).to_s, redirects_left: redirects_left - 1)
    else raise "HTTP #{response.code}"
    end
  end

  def parse(xml)
    Nokogiri::XML(xml) { |config| config.strict.nonet }.tap(&:remove_namespaces!)
  end

  def extract_items(doc)
    doc.css('channel > item, RDF > item, item, feed > entry, entry').uniq
  end

  def upsert_article(node)
    link = extract_link(node)
    return if link.blank?

    guid = node_text(node, GUID_SELECTORS).presence || link
    description = node_text(node, DESCRIPTION_SELECTORS)

    article = Article.find_or_initialize_by(feed_id: @feed.feed_id, guid: guid)
    article.assign_attributes(
      title: node_text(node, TITLE_SELECTORS).presence || 'Untitled article',
      link: link,
      content_html: sanitize_html(description).presence,
      content_text: strip_html(description).presence,
      thumbnail_url: extract_thumbnail(node),
      published_at: parse_date(node_text(node, DATE_SELECTORS))
    )
    "#{guid}: #{article.errors.full_messages.join(', ')}" unless article.save
  end

  def node_text(node, selectors)
    selectors.each do |selector|
      text = node.at_css(selector)&.text&.strip
      return text if text.present?
    end
    ''
  end

  def extract_link(node)
    link_node = node.at_css('link')
    return '' unless link_node

    (link_node['href'] || link_node['resource'] || link_node.text).to_s.strip
  end

  def extract_thumbnail(node)
    node.at_css('thumbnail, content')&.[]('url').presence ||
      node.at_css('enclosure')&.[]('url').presence
  end

  def fragment_for(html)
    Nokogiri::HTML.fragment(html.to_s.scrub, 'UTF-8')
  end

  def sanitize_html(html)
    fragment = fragment_for(html)
    fragment.xpath('.//comment()').remove

    fragment.traverse do |node|
      next unless node.element?

      tag = node.name.downcase
      if UNSAFE_TAGS.include?(tag)
        node.remove
      elsif SAFE_TAGS.include?(tag)
        sanitize_attributes(node, tag)
      else
        node.replace(node.children)
      end
    end

    fragment.to_s
  end

  def sanitize_attributes(node, tag)
    allowed = SAFE_ATTRIBUTES[tag] || []
    node.attribute_nodes.each do |attr|
      name = attr.name.downcase

      unless allowed.include?(name)
        attr.remove
        next
      end
      next unless URL_ATTRIBUTES.include?(name)

      attr.remove unless safe_url?(attr.value)
    end
  end

  def safe_url?(value)
    scheme = URI.parse(value.to_s.strip).scheme
    scheme.nil? || SAFE_URL_SCHEMES.include?(scheme.downcase)
  rescue URI::InvalidURIError
    false
  end

  def strip_html(html)
    fragment = fragment_for(html)
    fragment.css('script, style').remove
    fragment.text.gsub(/\s+/, ' ').strip
  end

  def parse_date(value)
    return nil if value.blank?

    Time.parse(value)
  rescue ArgumentError, TypeError
    nil
  end
end
