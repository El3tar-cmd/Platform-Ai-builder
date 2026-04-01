import React from 'react';
import { Settings, X, AlertCircle, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  onEndpointChange: (value: string) => void;
  models: string[];
  selectedModel: string;
  onModelChange: (value: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  endpoint,
  onEndpointChange,
  models,
  selectedModel,
  onModelChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Ollama Settings
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Ollama Endpoint URL
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => onEndpointChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
            >
              {models.length === 0 ? (
                <option value="">No models found</option>
              ) : (
                models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-4">
            <h3 className="text-sm font-medium text-indigo-400 mb-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Important Note on CORS
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To allow this web app to connect to your local Ollama instance, you must start
              Ollama with CORS enabled. Run this in your terminal:
            </p>
            <code className="block bg-black/50 p-2 rounded mt-2 text-xs text-indigo-300 font-mono">
              OLLAMA_ORIGINS="*" ollama serve
            </code>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
