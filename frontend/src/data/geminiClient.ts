import type { ArticleSummary } from './api/articles';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];
const MAX_INPUT_CHARS = 12_000;

class RateLimitedError extends Error {}
class UnavailableError extends Error {}

function buildPrompt(text: string): string {
  return (
    'Summarize the following news article in 3-4 concise sentences, covering only the key facts. ' +
    `Do not add commentary or opinions.\n\nArticle:\n${text.slice(0, MAX_INPUT_CHARS)}`
  );
}

function extractOutputText(body: unknown): string {
  const steps = (body as { steps?: unknown[] })?.steps;
  if (!Array.isArray(steps)) return '';
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i] as { type?: string; content?: { text?: string }[] };
    if (step?.type === 'model_output') {
      return (step.content?.[0]?.text ?? '').trim();
    }
  }
  return '';
}

async function requestSummary(apiKey: string, model: string, prompt: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ model, input: prompt }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new UnavailableError(`Gemini API request failed for ${model}`);
  }

  if (response.status === 429) {
    throw new RateLimitedError(`Gemini API rate limit exceeded for ${model}`);
  }
  if (!response.ok) {
    throw new Error(`Gemini API error: HTTP ${response.status}`);
  }

  const body = await response.json();
  const text = extractOutputText(body);
  if (!text) throw new Error('Gemini API returned no summary text');
  return text;
}

export async function summarizeWithGemini(text: string, signal?: AbortSignal): Promise<ArticleSummary> {
  const apiKey = import.meta.env.VITE_GEMINI_PUBLIC_API_KEY as string | undefined;
  if (!apiKey) throw new Error('AI summarizer is not configured for this deployment');

  const prompt = buildPrompt(text);
  let lastError: Error | undefined;

  for (const model of MODELS) {
    try {
      const summaryText = await requestSummary(apiKey, model, prompt, signal);
      return { text: summaryText, model };
    } catch (err) {
      if (err instanceof RateLimitedError || err instanceof UnavailableError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Failed to generate summary');
}
