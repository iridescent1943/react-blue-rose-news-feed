RSpec.describe GeminiSummarizer do
  let(:api_url) { GeminiSummarizer::API_URL }
  let(:models) { GeminiSummarizer::MODELS }

  def success_body(text)
    { steps: [{ type: 'thought' }, { type: 'model_output', content: [{ text: "  #{text}  " }] }] }.to_json
  end

  def stub_model(model)
    stub_request(:post, api_url).with(body: hash_including('model' => model))
  end

  it 'returns the summary from the first model' do
    stub = stub_request(:post, api_url)
           .with(headers: { 'x-goog-api-key' => 'test-gemini-key' }, body: hash_including('model' => models.first))
           .to_return(body: success_body('Short summary.'))

    result = GeminiSummarizer.summarize('Article text')

    expect(result).to have_attributes(text: 'Short summary.', model: models.first)
    expect(stub).to have_been_requested.once
  end

  it 'truncates long input' do
    stub_request(:post, api_url).to_return(body: success_body('ok'))
    max = GeminiSummarizer::MAX_INPUT_CHARS

    GeminiSummarizer.summarize('a' * 20_000)

    expect(
      a_request(:post, api_url).with do |req|
        input = JSON.parse(req.body)['input']
        input.end_with?('a' * max) && !input.include?('a' * (max + 1))
      end
    ).to have_been_made
  end

  it 'falls back to the next model when rate limited or unavailable' do
    stub_model(models[0]).to_return(status: 429)
    stub_model(models[1]).to_timeout
    stub_model(models[2]).to_return(body: success_body('Fallback'))

    expect(GeminiSummarizer.summarize('text')).to have_attributes(text: 'Fallback', model: models[2])
  end

  it 'raises RateLimitedError when every model is exhausted' do
    stub_request(:post, api_url).to_return(status: 429)

    expect { GeminiSummarizer.summarize('text') }.to raise_error(GeminiSummarizer::RateLimitedError)
    expect(a_request(:post, api_url)).to have_been_made.times(models.size)
  end

  it 'does not fall back on other HTTP errors' do
    stub_request(:post, api_url).to_return(status: 500)

    expect { GeminiSummarizer.summarize('text') }
      .to raise_error(GeminiSummarizer::Error, 'Gemini API error: HTTP 500')
    expect(a_request(:post, api_url)).to have_been_made.once
  end

  it 'raises when the response has no text' do
    stub_request(:post, api_url).to_return(body: { steps: [] }.to_json)

    expect { GeminiSummarizer.summarize('text') }
      .to raise_error(GeminiSummarizer::Error, 'Gemini API returned no summary text')
  end
end
