import { useState, useEffect } from 'react';
import { fetchOllamaModels } from '../lib/ollama';

/**
 * Manages Ollama endpoint connection, model listing, and selection.
 * Persists endpoint and selected model to localStorage.
 */
export function useOllamaModels() {
  const [endpoint, setEndpoint] = useState(
    () => localStorage.getItem('stitch_endpoint') || 'http://localhost:11434'
  );
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('stitch_model') || ''
  );

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('stitch_endpoint', endpoint);
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem('stitch_model', selectedModel);
  }, [selectedModel]);

  // Fetch models when endpoint changes
  useEffect(() => {
    const loadModels = async () => {
      const availableModels = await fetchOllamaModels(endpoint);
      setModels(availableModels);
      if (availableModels.length > 0 && !selectedModel) {
        setSelectedModel(availableModels[0]);
      }
    };
    loadModels();
  }, [endpoint]);

  return { endpoint, setEndpoint, models, selectedModel, setSelectedModel };
}
