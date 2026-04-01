import React from 'react';
import { FileCode2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { OllamaMessage } from '../../types';

interface ChatMessageProps {
  message: OllamaMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[90%] p-3 rounded-lg text-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : 'bg-zinc-800 text-zinc-300 rounded-tl-none border border-zinc-700'
        }`}
      >
        {isUser ? (
          <div>
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${img}`}
                    alt="Uploaded"
                    className="w-16 h-16 object-cover rounded border border-indigo-500/30"
                  />
                ))}
              </div>
            )}
            {message.content}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content || 'Thinking...'}</ReactMarkdown>
            {message.filesGenerated && message.filesGenerated.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-400" /> Generated Files:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.filesGenerated.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-300 flex items-center gap-1"
                    >
                      <FileCode2 className="w-3 h-3 text-indigo-400" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
