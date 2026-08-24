class NotesController < ApplicationController
  get '/api/notes' do
    notes = Note.active
    notes = notes.where(article_id: params[:article_id]) if params[:article_id].present?
    json_response(200, notes)
  end

  post '/api/notes' do
    require_admin!
    payload = parse_json_body(request)
    halt_error(400, 'article_id is required') if payload['article_id'].to_s.empty?
    halt_error(400, 'content is required') if payload['content'].to_s.empty?

    note = Note.new(article_id: payload['article_id'], user_id: current_user.user_id, content: payload['content'])
    if note.save
      json_response(201, note)
    else
      halt_error(422, note.errors.full_messages.join(', '))
    end
  end

  patch '/api/notes/:id' do
    require_admin!
    note = Note.active.find_by(note_id: params[:id])
    halt_error(404, 'Note not found') unless note

    payload = parse_json_body(request)
    if note.update(content: payload['content'])
      json_response(200, note)
    else
      halt_error(422, note.errors.full_messages.join(', '))
    end
  end

  delete '/api/notes/:id' do
    require_admin!
    note = Note.active.find_by(note_id: params[:id])
    halt_error(404, 'Note not found') unless note

    note.update(deleted_at: Time.current)
    status 204
  end
end
