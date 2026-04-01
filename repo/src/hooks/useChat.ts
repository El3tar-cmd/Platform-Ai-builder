import { useState, useRef, useCallback } from 'react';
import { streamOllamaChat } from '../lib/ollama';
import { parseFilesFromStream } from '../utils/file-parser';
import { SearchService } from '../services/SearchService';
import type { OllamaMessage, Project, Attachment } from '../types';

interface UseChatOptions {
  messages: OllamaMessage[];
  files: Record<string, string>;
  endpoint: string;
  selectedModel: string;
  attachments: Attachment[];
  clearAttachments: () => void;
  updateCurrentProject: (updates: Partial<Project>) => void;
  pushToHistory: (messages: OllamaMessage[], files: Record<string, string>) => void;
  currentProjectName: string;
}

/**
 * Manages AI chat: input state, streaming generation, error handling.
 * Handles the full send → stream → parse → update lifecycle.
 */
export function useChat({
  messages,
  files,
  endpoint,
  selectedModel,
  attachments,
  clearAttachments,
  updateCurrentProject,
  pushToHistory,
  currentProjectName,
}: UseChatOptions) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState<string | boolean>(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedModel) return;

    const userMsg: OllamaMessage = {
      role: 'user',
      content: input,
      ...(attachments.length > 0 && { images: attachments.map((a) => a.base64) }),
    };
    const newMessages = [...messages, userMsg];

    // Auto-name project on first user message
    const isFirstMessage = messages.length === 1 && messages[0].role === 'system';
    let newProjectName = currentProjectName;
    if (isFirstMessage) {
      newProjectName = input.length > 30 ? input.substring(0, 30) + '...' : input;
    }

    updateCurrentProject({ messages: newMessages, name: newProjectName });
    setInput('');
    clearAttachments();
    setIsGenerating(true);
    setError(null);

    abortControllerRef.current = new AbortController();
    let currentText = '';
    let currentFiles = { ...files };
    let chatMessages: OllamaMessage[] = [...newMessages];
    let loopCount = 0;
    const MAX_TOOLS = 2; // Prevent infinite loops

    try {
      while (loopCount < MAX_TOOLS) {
        loopCount++;
        let searchContext = '';

        // 1. Pre-search if Globe is enabled (only on first turn)
        if (isWebSearchEnabled && loopCount === 1) {
          setIsSearching(`Optimizing query for "${input.substring(0, 20)}..."`);
          try {
            searchContext = await SearchService.searchWeb(input);
          } catch (e) {
            console.error('Search failed:', e);
          } finally {
            setIsSearching(false);
          }
        }

        // 2. Inject context (Files + Search)
        const fileContext =
          Object.keys(currentFiles).length > 0
            ? `\n\n--- CURRENT FILES ---\n${JSON.stringify(currentFiles)}\n\nIMPORTANT: Use <edit> to patch files.`
            : '';

        const messagesForOllama = chatMessages.map((msg, idx) => {
          if (idx === chatMessages.length - 1 && msg.role === 'user') {
            return { ...msg, content: searchContext + msg.content + fileContext };
          }
          return msg;
        });

        // Add temporary assistant message for current turn
        const turnStartIndex = chatMessages.length;
        chatMessages = [...chatMessages, { role: 'assistant' as const, content: '' }];
        updateCurrentProject({ messages: chatMessages });

        const stream = streamOllamaChat(
          endpoint,
          selectedModel,
          messagesForOllama,
          abortControllerRef.current?.signal
        );

        let turnText = '';
        currentText = ''; // Reset global currentText for final state

        for await (const chunk of stream) {
          turnText += chunk;
          currentText += chunk;

          const { files: tempFiles, cleanText } = parseFilesFromStream(turnText, files);

          if (Object.keys(tempFiles).length > 0) {
            currentFiles = { ...currentFiles, ...tempFiles };
            updateCurrentProject({ files: currentFiles });
          }

          chatMessages[turnStartIndex] = {
            role: 'assistant' as const,
            content: cleanText,
            filesGenerated: Object.keys(tempFiles).length > 0 ? Object.keys(tempFiles) : undefined,
          };
          updateCurrentProject({ messages: [...chatMessages] });
        }

        // 3. Tool Call Detection: Did AI ask for another search?
        const searchMatch = turnText.match(/<web_search>(.*?)<\/web_search>/);
        if (searchMatch && searchMatch[1]) {
          const query = searchMatch[1].trim();
          setIsSearching(`Deep Research: "${query}"`);
          const results = await SearchService.searchWeb(query);
          setIsSearching(false);

          // Add search results as a hidden system/user message and continue loop
          chatMessages = [
            ...chatMessages,
            { role: 'user' as const, content: results }
          ];
          updateCurrentProject({ messages: chatMessages });
          continue; // Trigger next turn
        }

        break; // No more tool calls, exit loop
      }

      pushToHistory(chatMessages, currentFiles);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation stopped by user');
        pushToHistory(chatMessages, currentFiles);
      } else {
        setError(err.message || 'Failed to connect to Ollama.');
        updateCurrentProject({ messages: newMessages });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [
    input,
    selectedModel,
    attachments,
    messages,
    files,
    endpoint,
    currentProjectName,
    updateCurrentProject,
    clearAttachments,
    pushToHistory,
  ]);

  return {
    input,
    setInput,
    isGenerating,
    isSearching,
    isWebSearchEnabled,
    setIsWebSearchEnabled,
    error,
    clearError,
    sendMessage,
    stopGeneration,
  };
}
