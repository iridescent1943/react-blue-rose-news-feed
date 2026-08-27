import type { Note } from '../../types';
import { apiRequest } from './http';

interface NoteRow {
  note_id: number;
  content: string;
  created_at: string;
}

function mapNote(row: NoteRow): Note {
  return { id: String(row.note_id), text: row.content, createdAt: row.created_at };
}

export async function listNotesForArticle(articleId: number): Promise<Note[]> {
  const rows = await apiRequest<NoteRow[]>(`/notes?article_id=${articleId}`);
  return rows.map(mapNote);
}

export async function createNote(articleId: number, text: string): Promise<Note> {
  const row = await apiRequest<NoteRow>('/notes', {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId, content: text }),
  });
  return mapNote(row);
}

export async function updateNote(id: string, text: string): Promise<Note> {
  const row = await apiRequest<NoteRow>(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content: text }),
  });
  return mapNote(row);
}

export async function deleteNote(id: string): Promise<void> {
  await apiRequest<void>(`/notes/${id}`, { method: 'DELETE' });
}
