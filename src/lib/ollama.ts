export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
  filesGenerated?: string[];
}

export async function* streamOllamaChat(
  endpoint: string,
  model: string,
  messages: OllamaMessage[],
  signal?: AbortSignal
) {
  const baseUrl = endpoint.replace(/\/$/, '');

  // Strip out filesGenerated before sending to Ollama to save bandwidth/prevent errors
  const cleanMessages = messages.map(({ role, content, images }) => ({
    role,
    content,
    ...(images && images.length > 0 ? { images } : {})
  }));

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: cleanMessages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No reader available');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((line) => line.trim() !== '');

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield data.message.content;
        }
      } catch (e) {
        console.error('Error parsing Ollama chunk:', e);
      }
    }
  }
}

export async function fetchOllamaModels(endpoint: string): Promise<string[]> {
  try {
    const baseUrl = endpoint.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) {
      console.warn(`Ollama API returned status ${res.status}. Is it running?`);
      return [];
    }
    const data = await res.json();
    if (!data.models) return [];
    return data.models.map((m: any) => m.name);
  } catch (e) {
    console.error('Failed to fetch Ollama models. Ensure Ollama is running locally (http://localhost:11434) and CORS is allowed.', e);
    return [];
  }
}
