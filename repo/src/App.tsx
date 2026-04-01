import React, { useState, useEffect } from 'react';
import { Monitor, Loader2 } from 'lucide-react';

// Hooks
import { useOllamaModels } from './hooks/useOllamaModels';
import { useProjects } from './hooks/useProjects';
import { useAttachments } from './hooks/useAttachments';
import { useChat } from './hooks/useChat';
import { useWebContainer } from './hooks/useWebContainer';

// Utils
import { exportToZip, exportToStackBlitz } from './utils/export';

// Components
import { ChatSidebar } from './components/chat/ChatSidebar';
import { MainToolbar } from './components/toolbar/MainToolbar';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { CodeView } from './components/editor/CodeView';
import { SettingsModal } from './components/modals/SettingsModal';
import { ProjectsSidebar } from './components/modals/ProjectsSidebar';

export default function App() {
  // ─── UI State ───
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(false);

  // ─── Hooks ───
  const { endpoint, setEndpoint, models, selectedModel, setSelectedModel } =
    useOllamaModels();

  const {
    projects,
    currentProject,
    currentProjectId,
    messages,
    files,
    updateCurrentProject,
    pushToHistory,
    handleUndo,
    handleRedo,
    createProject,
    switchProject,
    deleteProject,
    clearChat,
  } = useProjects();

  const { attachments, fileInputRef, handleFileChange, removeAttachment, clearAttachments } =
    useAttachments();

  const {
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
  } = useChat({
    messages,
    files,
    endpoint,
    selectedModel,
    attachments,
    clearAttachments,
    updateCurrentProject,
    pushToHistory,
    currentProjectName: currentProject.name,
  });

  const {
    iframeUrl,
    isBooting,
    isSafeMode,
    setIsSafeMode,
    isAutoSync,
    setIsAutoSync,
    deviceSize,
    setDeviceSize,
    activeTab,
    setActiveTab,
    syncPreview,
    resetViewer,
    getIframeWidth,
    terminalRef,
  } = useWebContainer({ files, isGenerating });

  // ─── Click-to-Edit Listener ───
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Must verify this comes from our iframe or at least has our expected payload
      if (e.data && e.data.type === 'CLICK_TO_EDIT') {
        const { tagName, className, id, text } = e.data;
        
        let selector = tagName;
        if (id) selector += `#${id}`;
        if (className) {
          // simple cleaning of className
          selector += `.${className.split(' ').filter(Boolean).join('.')}`;
        }
        
        const textFocus = text ? ` containing "${text.trim()}"` : '';
        const uiMessage = `[Selected element: <${selector}>${textFocus}]`;
        
        // Append it neatly to the input
        setInput((prev) => (prev ? `${prev.trim()}\n${uiMessage}\n` : `${uiMessage}\n`));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setInput]);

  // ─── Orchestrated Handlers ───
  const handleSendMessage = () => {
    setIsMobileMenuOpen(false);
    sendMessage();
  };

  const handleResetViewer = () => {
    resetViewer();
    clearError();
  };

  const handleCreateProject = () => {
    createProject();
    setIsProjectsSidebarOpen(false);
  };

  const handleSwitchProject = (id: string) => {
    if (isGenerating) stopGeneration();
    switchProject(id);
    setIsProjectsSidebarOpen(false);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === currentProjectId && isGenerating) {
      stopGeneration();
    }
    deleteProject(id);
  };

  const handleExportZip = () => {
    exportToZip(files, currentProject.name);
  };

  const handleExportStackBlitz = () => {
    exportToStackBlitz(files, currentProject.name);
  };

  const handleSaveToHistory = () => {
    pushToHistory(messages, files);
  };

  // ─── Render ───
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      {/* Chat Sidebar */}
      <ChatSidebar
        currentProject={currentProject}
        onOpenProjects={() => setIsProjectsSidebarOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearChat={clearChat}
        onOpenSettings={() => setShowSettings(true)}
        messages={messages}
        isGenerating={isGenerating}
        isSearching={isSearching}
        onPromptSelect={setInput}
        input={input}
        onInputChange={setInput}
        onSend={handleSendMessage}
        onStopGeneration={stopGeneration}
        selectedModel={selectedModel}
        isWebSearchEnabled={isWebSearchEnabled}
        onToggleWebSearch={() => setIsWebSearchEnabled((prev) => !prev)}
        error={error}
        attachments={attachments}
        onRemoveAttachment={removeAttachment}
        onFileChange={handleFileChange}
        fileInputRef={fileInputRef}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Stage */}
      <div className="flex-1 flex flex-col bg-zinc-950 min-w-0">
        <MainToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          deviceSize={deviceSize}
          onDeviceSizeChange={setDeviceSize}
          isAutoSync={isAutoSync}
          onToggleAutoSync={() => setIsAutoSync(!isAutoSync)}
          onManualSync={syncPreview}
          isGenerating={isGenerating}
          onResetViewer={handleResetViewer}
          onExportZip={handleExportZip}
          hasFiles={Object.keys(files).length > 0}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-[#0a0a0a] flex items-center justify-center p-4">
          {Object.keys(files).length === 0 && !isGenerating ? (
            <div className="text-center text-zinc-600 flex flex-col items-center justify-center h-full w-full absolute inset-0 z-20 bg-zinc-950">
              <Monitor className="w-12 h-12 mb-4 opacity-20" />
              <p>Your generated React app will appear here.</p>
            </div>
          ) : null}

          {/* Render PreviewPanel (kept alive to preserve xterm state) */}
          <div className={`absolute inset-4 sm:inset-6 transition-opacity duration-200 ${
            (activeTab === 'preview' || activeTab === 'console') ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}>
            <PreviewPanel
              activeTab={activeTab}
              isSafeMode={isSafeMode}
              isGenerating={isGenerating}
              iframeWidth={getIframeWidth()}
              iframeUrl={iframeUrl}
              isBooting={isBooting}
              terminalRef={terminalRef}
            />
          </div>

          {/* Render CodeView (kept alive to preserve Monaco editor state) */}
          <div className={`absolute inset-4 sm:inset-6 transition-opacity duration-200 ${
            activeTab === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}>
            <CodeView
              files={files}
              currentProject={currentProject}
              messages={messages}
              onUpdateFiles={(newFiles) => updateCurrentProject({ files: newFiles })}
              onSaveToHistory={handleSaveToHistory}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProjectsSidebar
        isOpen={isProjectsSidebarOpen}
        onClose={() => setIsProjectsSidebarOpen(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onCreateProject={handleCreateProject}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProject}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        endpoint={endpoint}
        onEndpointChange={setEndpoint}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
