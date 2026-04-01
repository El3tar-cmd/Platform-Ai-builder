import React from 'react';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import type { Project, OllamaMessage, Attachment } from '../../types';

interface ChatSidebarProps {
  // Header props
  currentProject: Project;
  onOpenProjects: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  // History props
  messages: OllamaMessage[];
  isGenerating: boolean;
  isSearching: string | boolean;
  onPromptSelect: (prompt: string) => void;
  // Input props
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStopGeneration: () => void;
  selectedModel: string;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  isMultiAgentEnabled?: boolean;
  onToggleMultiAgent?: () => void;
  error: string | null;
  attachments: Attachment[];
  isProcessing?: boolean;
  onRemoveAttachment: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Database
  isFirebaseConfigured?: boolean;
  // Mobile
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export function ChatSidebar({
  currentProject,
  onOpenProjects,
  onUndo,
  onRedo,
  onClearChat,
  onOpenSettings,
  messages,
  isGenerating,
  isSearching,
  onPromptSelect,
  input,
  onInputChange,
  onSend,
  onStopGeneration,
  selectedModel,
  isWebSearchEnabled,
  onToggleWebSearch,
  isMultiAgentEnabled,
  onToggleMultiAgent,
  error,
  attachments,
  isProcessing,
  onRemoveAttachment,
  onFileChange,
  fileInputRef,
  isFirebaseConfigured,
  isMobileMenuOpen,
  onCloseMobileMenu,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onCloseMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 md:w-full flex flex-col border-r border-zinc-800 bg-zinc-900/95 backdrop-blur-xl transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 h-full`}
      >
        <ChatHeader
          currentProject={currentProject}
          onOpenProjects={onOpenProjects}
          onUndo={onUndo}
          onRedo={onRedo}
          onClearChat={onClearChat}
          onOpenSettings={onOpenSettings}
        />

        {/* System Status Bar */}
        <div className="px-4 py-2 border-b border-zinc-800 flex flex-col gap-2 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <Database className="w-3 h-3" />
              Database
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
              isFirebaseConfigured 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isFirebaseConfigured ? (
                <>
                  <CheckCircle className="w-2.5 h-2.5" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-2.5 h-2.5" />
                  Not Configured
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <CheckCircle className="w-3 h-3" />
              Multi-Agent
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
              isMultiAgentEnabled 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}>
              {isMultiAgentEnabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </div>

        <ChatHistory
          messages={messages}
          isGenerating={isGenerating}
          onPromptSelect={onPromptSelect}
        />

        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSend={onSend}
          isGenerating={isGenerating}
          isSearching={isSearching}
          onStopGeneration={onStopGeneration}
          selectedModel={selectedModel}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          isMultiAgentEnabled={isMultiAgentEnabled}
          onToggleMultiAgent={onToggleMultiAgent}
          error={error}
          attachments={attachments}
          isProcessing={isProcessing}
          onRemoveAttachment={onRemoveAttachment}
          onFileChange={onFileChange}
          fileInputRef={fileInputRef}
        />
      </div>
    </>
  );
}
