import React, { useState, useEffect } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

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
import { PackageManagerModal } from './components/modals/PackageManagerModal';
import { GitHubModal } from './components/modals/GitHubModal';

export default function App() {
  // ─── UI State ───
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(false);
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

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

  const { attachments, isProcessing, fileInputRef, handleFileChange, removeAttachment, clearAttachments } =
    useAttachments();

  const {
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

  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);

  useEffect(() => {
    // Check if firebase config exists in files
    if (files['firebase-applet-config.json']) {
      setIsFirebaseConfigured(true);
    } else {
      setIsFirebaseConfigured(false);
    }
  }, [files]);

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
    attachTerminal,
    installPackage,
    uninstallPackage,
  } = useWebContainer({ files, isGenerating });

  // ─── Click-to-Edit & Sandbox Observer Listener ───
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'CLICK_TO_EDIT') {
        const { tagName, className, id, text } = e.data;
        
        let selector = tagName;
        if (id) selector += `#${id}`;
        if (className) {
          selector += `.${className.split(' ').filter(Boolean).join('.')}`;
        }
        
        const textFocus = text ? ` containing "${text.trim()}"` : '';
        const uiMessage = `[Selected element: <${selector}>${textFocus}]`;
        
        setInput((prev) => (prev ? `${prev.trim()}\n${uiMessage}\n` : `${uiMessage}\n`));
      } else if (e.data.type === 'RUNTIME_ERROR') {
        const errorMsg = e.data.payload;
        // Append error to input so user can send it to AI
        setInput((prev) => {
          if (prev.includes(errorMsg)) return prev; // Prevent duplicates
          return prev ? `${prev.trim()}\n\n${errorMsg}\n` : `${errorMsg}\n`;
        });
      } else if (e.data.type === 'DOM_SNAPSHOT') {
        const snapshotMsg = `\n\n--- CURRENT APP DOM SNAPSHOT ---\n${e.data.payload}\n--- END DOM ---\n`;
        setInput((prev) => (prev ? `${prev.trim()}${snapshotMsg}` : snapshotMsg));
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

  const handleOpenDatabase = () => {
    // This will be handled by the agent when the user asks for it
    console.log('Database setup requested');
  };

  const handleAddPackage = async (pkg: string) => {
    const newPackageJson = await installPackage(pkg);
    if (newPackageJson) {
      updateCurrentProject({
        files: {
          ...files,
          'package.json': newPackageJson,
        },
      });
    }
  };

  const handleRemovePackage = async (pkg: string) => {
    const newPackageJson = await uninstallPackage(pkg);
    if (newPackageJson) {
      updateCurrentProject({
        files: {
          ...files,
          'package.json': newPackageJson,
        },
      });
    }
  };

  // Get dependencies from package.json
  const getDependencies = () => {
    try {
      const packageJsonStr = files['package.json'];
      if (!packageJsonStr) return {};
      const packageJson = JSON.parse(packageJsonStr);
      return packageJson.dependencies || {};
    } catch (error) {
      return {};
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── Render ───
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      {/* Mobile Sidebar (Fixed Overlay) */}
      {isMobile && (
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
          isMultiAgentEnabled={isMultiAgentEnabled}
          onToggleMultiAgent={() => setIsMultiAgentEnabled((prev) => !prev)}
          error={error}
          attachments={attachments}
          isProcessing={isProcessing}
          onRemoveAttachment={removeAttachment}
          onFileChange={handleFileChange}
          fileInputRef={fileInputRef}
          isFirebaseConfigured={isFirebaseConfigured}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      )}

      <PanelGroup orientation="horizontal">
        {/* Chat Sidebar Panel (Desktop only) */}
        {!isMobile && (
          <>
            <Panel defaultSize={25} minSize={20} maxSize={40}>
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
                isMultiAgentEnabled={isMultiAgentEnabled}
                onToggleMultiAgent={() => setIsMultiAgentEnabled((prev) => !prev)}
                error={error}
                attachments={attachments}
                isProcessing={isProcessing}
                onRemoveAttachment={removeAttachment}
                onFileChange={handleFileChange}
                fileInputRef={fileInputRef}
                isFirebaseConfigured={isFirebaseConfigured}
                isMobileMenuOpen={isMobileMenuOpen}
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              />
            </Panel>
            <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-indigo-500 transition-colors cursor-col-resize" />
          </>
        )}

        {/* Main Stage Panel */}
        <Panel defaultSize={isMobile ? 100 : 75} minSize={0}>
          <div className="h-full flex flex-col bg-zinc-950 min-w-0 w-full">
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
              onOpenPackageManager={() => setIsPackageManagerOpen(true)}
              onOpenGitHub={() => setIsGitHubModalOpen(true)}
              onOpenDatabase={handleOpenDatabase}
              onSave={handleSaveToHistory}
              isTerminalVisible={isTerminalVisible}
              onToggleTerminal={() => setIsTerminalVisible(!isTerminalVisible)}
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
                  attachTerminal={attachTerminal}
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
                  isTerminalVisible={isTerminalVisible}
                  terminalRef={terminalRef}
                  isMobile={isMobile}
                  attachTerminal={attachTerminal}
                  activeTab={activeTab}
                />
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>

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

      <PackageManagerModal
        isOpen={isPackageManagerOpen}
        onClose={() => setIsPackageManagerOpen(false)}
        dependencies={getDependencies()}
        onAddPackage={handleAddPackage}
        onRemovePackage={handleRemovePackage}
      />

      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        files={files}
        projectName={currentProject.name}
      />
    </div>
  );
}
