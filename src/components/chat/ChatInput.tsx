import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Paperclip, Send, Square, X, Globe, Eye, Mic, MicOff, FileText, Loader2 } from 'lucide-react';
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
  isProcessing?: boolean;
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
  isProcessing,
  onRemoveAttachment,
  onFileChange,
  fileInputRef,
}: ChatInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ar-EG'; // Set to Arabic as requested

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const currentInput = inputRef.current;
          onInputChange(currentInput + (currentInput && !currentInput.endsWith(' ') ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onInputChange]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Error starting speech recognition:', e);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const requestDomSnapshot = () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'REQUEST_DOM_SNAPSHOT' }, '*');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      onFileChange(syntheticEvent);
    }
  };

  return (
    <div 
      className={`relative flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-colors ${isDragging ? 'bg-indigo-900/20 border-indigo-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm border-2 border-indigo-500 border-dashed rounded-t-xl">
          <div className="flex flex-col items-center text-indigo-400">
            <Paperclip className="w-10 h-10 mb-2 animate-bounce" />
            <p className="font-medium text-lg">Drop files here</p>
            <p className="text-xs text-indigo-400/70 mt-1">Supports images, code, and text files</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {(attachments.length > 0 || isProcessing) && (
        <div className="flex flex-wrap gap-3 mb-4 px-1">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl border border-zinc-700/50 bg-zinc-800/50 overflow-hidden shadow-sm">
                {attachment.isText ? (
                  <div className="flex flex-col items-center justify-center p-1 w-full h-full text-indigo-400/80 bg-indigo-500/5">
                    <FileText className="w-6 h-6 mb-1" />
                    <span className="text-[9px] font-medium truncate w-full text-center px-1 text-zinc-300" title={attachment.name}>
                      {attachment.name?.split('.').pop()?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                ) : (
                  <img
                    src={attachment.url}
                    alt={attachment.name || "Attachment"}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                onClick={() => onRemoveAttachment(index)}
                className="absolute -top-2 -right-2 p-1 bg-zinc-700 hover:bg-red-500 text-zinc-300 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md z-10 border border-zinc-600 hover:border-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center justify-center w-16 h-16 rounded-xl border border-indigo-500/30 border-dashed bg-indigo-500/5">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-col gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
        {/* Top Toolbar */}
        <div className="flex items-center gap-1 px-1 pb-2 border-b border-zinc-700/50">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
            title="Attach File or Image"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*,.txt,.csv,.json,.md,.ts,.tsx,.js,.jsx,.html,.css"
            multiple
            className="hidden"
          />
          <button
            onClick={onToggleWebSearch}
            className={`p-1.5 rounded-md transition-colors shrink-0 ${
              isWebSearchEnabled 
                ? 'text-indigo-400 bg-indigo-500/10' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={isWebSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
          >
            <Globe className={`w-4 h-4 ${isSearching ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button
            onClick={requestDomSnapshot}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
            title="Capture Sandbox Vision (Send DOM to AI)"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={toggleListening}
            className={`p-1.5 rounded-md transition-colors shrink-0 ${
              isListening 
                ? 'text-red-400 bg-red-500/10 animate-pulse' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 px-1 pb-1">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or describe a feature..."
            className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 py-1 text-sm resize-none max-h-40 overflow-y-auto"
            rows={1}
          />
          {isGenerating ? (
            <button
              onClick={onStopGeneration}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors shrink-0 mb-1"
              title="Stop Generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() && attachments.length === 0}
              className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-colors shrink-0 disabled:opacity-50 disabled:hover:bg-transparent mb-1"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
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
