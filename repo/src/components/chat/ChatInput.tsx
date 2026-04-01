import React from 'react';
import { AlertCircle, Paperclip, Send, Square, X, Globe } from 'lucide-react';
import type { Attachment } from '../../types';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isGenerating: boolean;
  isSearching: string | boolean;
  onStopGeneration: () => void;
  selectedModel: string;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  error: string | null;
  attachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  isGenerating,
  isSearching,
  onStopGeneration,
  selectedModel,
  isWebSearchEnabled,
  onToggleWebSearch,
  error,
  attachments,
  onRemoveAttachment,
  onFileChange,
  fileInputRef,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              <img
                src={attachment.url}
                alt="Attachment"
                className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={() => onRemoveAttachment(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
          title="Attach Image"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
        <button
          onClick={onToggleWebSearch}
          className={`p-2 rounded-md transition-colors shrink-0 ${
            isWebSearchEnabled 
              ? 'text-indigo-400 bg-indigo-500/10' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title={isWebSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
        >
          <Globe className={`w-4 h-4 ${isSearching ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything or describe a feature..."
          className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 py-2 text-sm resize-none max-h-40 overflow-y-auto"
          rows={1}
        />
        {isGenerating ? (
          <button
            onClick={onStopGeneration}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
            title="Stop Generation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim() && attachments.length === 0}
            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-colors shrink-0 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        {isSearching && (
          <div className="flex items-center gap-1.5 text-indigo-400 animate-pulse">
            <Globe className="w-3 h-3 animate-spin" />
            <span className="text-[10px] uppercase font-bold tracking-widest">
              {typeof isSearching === 'string' ? isSearching : 'Researching...'}
            </span>
          </div>
        )}
        {!isSearching && (
          <div className="text-[10px] text-zinc-500">
            Powered by Ollama ({selectedModel || 'No model selected'})
          </div>
        )}
      </div>
    </div>
  );
}
