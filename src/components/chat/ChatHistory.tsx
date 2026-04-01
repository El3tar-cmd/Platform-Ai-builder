import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { EmptyState } from './EmptyState';
import type { OllamaMessage } from '../../types';

interface ChatHistoryProps {
  messages: OllamaMessage[];
  isGenerating: boolean;
  onPromptSelect: (prompt: string) => void;
}

export function ChatHistory({ messages, isGenerating, onPromptSelect }: ChatHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {visibleMessages.length === 0 ? (
        <EmptyState onPromptSelect={onPromptSelect} />
      ) : (
        visibleMessages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)
      )}
      {isGenerating && (
        <div className="flex items-start">
          <div className="bg-zinc-800 text-zinc-300 p-3 rounded-lg rounded-tl-none border border-zinc-700 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            Generating professional React structure...
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
