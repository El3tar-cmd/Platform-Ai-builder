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
  const [isMultiAgentEnabled, setIsMultiAgentEnabled] = useState(false);
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
    if (!input.trim() && attachments.length === 0) return;
    if (!selectedModel) return;

    const imageAttachments = attachments.filter(a => !a.isText);
    const textAttachments = attachments.filter(a => a.isText);

    let finalInput = input;
    if (textAttachments.length > 0) {
      const textContent = textAttachments.map(a => `\n\n--- FILE: ${a.name} ---\n${a.textContent}\n--- END FILE ---`).join('');
      finalInput += textContent;
    }

    const userMsg: OllamaMessage = {
      role: 'user',
      content: finalInput,
      ...(imageAttachments.length > 0 && { images: imageAttachments.map((a) => a.base64) }),
    };
    const newMessages = [...messages, userMsg];

    // Auto-name project on first user message
    const isFirstMessage = messages.length === 1 && messages[0].role === 'system';
    let newProjectName = currentProjectName;
    if (isFirstMessage) {
      const nameSource = input.trim() || (attachments.length > 0 ? `Attachment: ${attachments[0].name || 'File'}` : 'New Project');
      newProjectName = nameSource.length > 30 ? nameSource.substring(0, 30) + '...' : nameSource;
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
    const MAX_TOOLS = 4; // Allow up to 4 recursive tool calls (e.g., multiple searches)

    try {
      // --- MULTI-AGENT PLANNER STEP ---
      if (isMultiAgentEnabled) {
        setIsSearching('Architect Agent is planning...');
        
        const plannerMessages = [
          { role: 'system' as const, content: 'You are an expert Software Architect. Create a detailed, step-by-step implementation plan for the user\'s request. Do NOT write code. Only write the plan in markdown.' },
          ...chatMessages.filter(m => m.role !== 'system')
        ];

        const plannerStream = streamOllamaChat(
          endpoint,
          selectedModel,
          plannerMessages,
          abortControllerRef.current?.signal
        );

        let planText = '';
        const planStartIndex = chatMessages.length;
        chatMessages = [...chatMessages, { role: 'assistant' as const, content: '' }];
        updateCurrentProject({ messages: chatMessages });

        for await (const chunk of plannerStream) {
          planText += chunk;
          chatMessages[planStartIndex] = {
            role: 'assistant' as const,
            content: `**[Architect Agent Plan]**\n\n${planText}`,
          };
          updateCurrentProject({ messages: [...chatMessages] });
        }

        // Add the plan as context for the coder
        chatMessages = [
          ...chatMessages,
          { role: 'user' as const, content: 'Please implement the above plan. Write the code.' }
        ];
        setIsSearching('Coder Agent is implementing...');
      }

      while (loopCount < MAX_TOOLS) {
        loopCount++;
        let searchContext = '';

        // 1. Pre-search if Globe is enabled (only on first turn)
        if (isWebSearchEnabled && loopCount === 1 && !isMultiAgentEnabled) {
          setIsSearching(`Enhancing query for search...`);
          
          let optimizedQuery = input;
          try {
            // REAL Query Enhancement: Ask the model to generate a search query
            const enhancementPrompt = `You are a search query optimizer. Transform the user's request into a concise, effective search query for DuckDuckGo and Wikipedia. Output ONLY the query text.
User Request: ${input}`;

            const response = await fetch(`${endpoint}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: selectedModel,
                prompt: enhancementPrompt,
                stream: false,
                options: { temperature: 0.1 }
              }),
              signal: abortControllerRef.current?.signal
            });

            if (response.ok) {
              const data = await response.json();
              if (data.response) {
                optimizedQuery = data.response.trim().replace(/^"|"$/g, '');
                console.log(`[Search] Original: "${input}" -> Optimized: "${optimizedQuery}"`);
              }
            }
          } catch (e) {
            console.error('Query enhancement failed, falling back to original input:', e);
          }

          setIsSearching(`Searching Web: ${optimizedQuery}...`);
          try {
            searchContext = await SearchService.searchWeb(optimizedQuery);
          } catch (e) {
            console.error('Search failed:', e);
          } finally {
            setIsSearching(false);
          }
        } else {
           setIsSearching(false);
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

        // --- MULTI-AGENT REVIEWER STEP ---
        if (isMultiAgentEnabled && loopCount === 1) {
          setIsSearching('Reviewer Agent is checking code...');
          
          const reviewerMessages = [
            { role: 'system' as const, content: 'You are a Senior Code Reviewer. Review the code generated by the assistant. Check for syntax errors, missing imports, and potential bugs. If everything looks good, just say "Code looks solid.". If there are issues, provide a brief summary of what needs to be fixed.' },
            ...chatMessages
          ];

          const reviewerStream = streamOllamaChat(
            endpoint,
            selectedModel,
            reviewerMessages,
            abortControllerRef.current?.signal
          );

          let reviewText = '';
          const reviewStartIndex = chatMessages.length;
          chatMessages = [...chatMessages, { role: 'assistant' as const, content: '' }];
          updateCurrentProject({ messages: chatMessages });

          for await (const chunk of reviewerStream) {
            reviewText += chunk;
            chatMessages[reviewStartIndex] = {
              role: 'assistant' as const,
              content: `**[Reviewer Agent Feedback]**\n\n${reviewText}`,
            };
            updateCurrentProject({ messages: [...chatMessages] });
          }

          setIsSearching(false);
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
    isMultiAgentEnabled,
    setIsMultiAgentEnabled,
    error,
    clearError,
    sendMessage,
    stopGeneration,
  };
}
