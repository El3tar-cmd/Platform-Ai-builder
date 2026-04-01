import React from 'react';
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
  error: string | null;
  attachments: Attachment[];
  isProcessing?: boolean;
  onRemoveAttachment: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
  error,
  attachments,
  isProcessing,
  onRemoveAttachment,
  onFileChange,
  fileInputRef,
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
        className={`fixed inset-y-0 left-0 z-40 w-80 flex flex-col border-r border-zinc-800 bg-zinc-900/95 backdrop-blur-xl transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <ChatHeader
          currentProject={currentProject}
          onOpenProjects={onOpenProjects}
          onUndo={onUndo}
          onRedo={onRedo}
          onClearChat={onClearChat}
          onOpenSettings={onOpenSettings}
        />

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
