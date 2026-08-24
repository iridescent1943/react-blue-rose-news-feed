class ArticlesController < ApplicationController
  get '/api/articles' do
    refresh_stale_feeds
    owner_id = User.owner&.user_id
    articles = Keyword.count.zero? ? Article.with_state(owner_id) : Article.matching_keywords(owner_id)
    json_response(200, articles)
  end

  patch '/api/articles/:id/state' do
    require_admin!
    halt_error(404, 'Article not found') unless Article.exists?(article_id: params[:id])

    payload = parse_json_body(request)
    halt_error(400, 'is_read or is_saved is required') unless payload.key?('is_read') || payload.key?('is_saved')

    state = ArticleState.find_or_initialize_by(user_id: current_user.user_id, article_id: params[:id])
    state.mark_read!(payload['is_read']) if payload.key?('is_read')
    state.mark_saved!(payload['is_saved']) if payload.key?('is_saved')
    json_response(200, state)
  end

  private

  def refresh_stale_feeds
    stale_cutoff = Time.current - 10.minutes
    Feed.where(status: 'active')
        .where('last_fetched_at IS NULL OR last_fetched_at < ?', stale_cutoff)
        .find_each { |feed| FeedFetcher.fetch!(feed) }
  end
end
