require 'net/http'

class GeminiSummarizer
  class Error < StandardError; end
  class RateLimitedError < Error; end
  class UnavailableError < Error; end

  Result = Struct.new(:text, :model)

  API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
  MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ].freeze
  MODEL = MODELS.first
  OPEN_TIMEOUT = 15
  READ_TIMEOUT = 30
  MAX_INPUT_CHARS = 12_000
  NETWORK_ERRORS = [
    Net::OpenTimeout, Net::ReadTimeout, IOError, SocketError,
    Errno::ECONNREFUSED, Errno::ECONNRESET, OpenSSL::SSL::SSLError
  ].freeze

  def self.summarize(text)
    new.call(text)
  end

  def call(text)
    api_key = ENV.fetch('GEMINI_API_KEY')
    prompt = build_prompt(text)
    last_error = nil

    MODELS.each do |model|
      summary_text = request_summary(api_key, model, prompt)
      return Result.new(summary_text, model)
    rescue RateLimitedError, UnavailableError => e
      last_error = e
    end

    raise last_error
  end

  private

  def request_summary(api_key, model, prompt)
    uri = URI.parse(API_URL)
    headers = { 'Content-Type' => 'application/json', 'x-goog-api-key' => api_key }

    response =
      begin
        Net::HTTP.start(
          uri.host, uri.port,
          use_ssl: true, open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT
        ) do |http|
          request = Net::HTTP::Post.new(uri.request_uri, headers)
          request.body = { model: model, input: prompt }.to_json
          http.request(request)
        end
      rescue *NETWORK_ERRORS => e
        raise UnavailableError, "Gemini API request failed for #{model}: #{e.message}"
      end

    raise RateLimitedError, "Gemini API rate limit exceeded for #{model}" if response.code.to_i == 429
    raise Error, "Gemini API error: HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    body = JSON.parse(response.body)
    extract_output_text(body).presence || raise(Error, 'Gemini API returned no summary text')
  end

  def extract_output_text(body)
    step = body['steps'].to_a.reverse.find { |s| s['type'] == 'model_output' }
    step&.dig('content', 0, 'text').to_s.strip
  end

  def build_prompt(text)
    "Summarize the following news article in 3-4 concise sentences, covering only the key facts. " \
      "Do not add commentary or opinions.\n\nArticle:\n#{text.to_s[0, MAX_INPUT_CHARS]}"
  end
end
