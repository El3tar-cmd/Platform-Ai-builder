import React, { useState } from 'react';
import { FileCode2, GitCompare, Save, Terminal } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { FileExplorer } from './FileExplorer';
import type { Project, OllamaMessage } from '../../types';

interface CodeViewProps {
  files: Record<string, string>;
  currentProject: Project;
  messages: OllamaMessage[];
  onUpdateFiles: (files: Record<string, string>) => void;
  onSaveToHistory: () => void;
  isTerminalVisible?: boolean;
  terminalRef?: React.RefObject<HTMLDivElement | null>;
}

function getLanguage(filename: string): string {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.json')) return 'json';
  return 'javascript';
}

export function CodeView({
  files,
  currentProject,
  messages,
  onUpdateFiles,
  onSaveToHistory,
  isTerminalVisible = true,
  terminalRef,
}: CodeViewProps) {
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [isDiffView, setIsDiffView] = useState(false);

  const previousFiles =
    currentProject.historyIndex > 0
      ? currentProject.history[currentProject.historyIndex - 1].files
      : {};

  const handleCreateFile = (path: string) => {
    if (!files[path]) {
      onUpdateFiles({ ...files, [path]: '// New file\n' });
      setSelectedFile(path);
    }
  };

  const handleDeleteFile = (path: string) => {
    const newFiles = { ...files };
    delete newFiles[path];
    onUpdateFiles(newFiles);
    if (selectedFile === path) {
      const remainingFiles = Object.keys(newFiles);
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0] : '');
    }
  };

  const handleRenameFile = (oldPath: string, newPath: string) => {
    if (files[oldPath] && !files[newPath]) {
      const newFiles = { ...files };
      newFiles[newPath] = newFiles[oldPath];
      delete newFiles[oldPath];
      onUpdateFiles(newFiles);
      if (selectedFile === oldPath) {
        setSelectedFile(newPath);
      }
    }
  };

  return (
    <div className="w-full h-full flex bg-[#1e1e1e] rounded-lg border border-zinc-800 overflow-hidden">
      <PanelGroup orientation="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={40}>
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-[#252526] hover:bg-indigo-500 transition-colors cursor-col-resize" />

        <Panel defaultSize={80} minSize={30}>
          <PanelGroup orientation="vertical">
            <Panel defaultSize={70} minSize={20}>
              <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#1e1e1e]">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                  <div className="text-sm text-[#cccccc] flex items-center gap-2">
                    <FileCode2 className="w-4 h-4" />
                    {selectedFile}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDiffView(!isDiffView)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        isDiffView
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d]'
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      Diff View
                    </button>
                    <button
                      onClick={onSaveToHistory}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4d4d4d] transition-colors"
                      title="Save manual edits to history"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 relative">
                  {isDiffView ? (
                    <DiffEditor
                      height="100%"
                      language={getLanguage(selectedFile)}
                      theme="vs-dark"
                      original={previousFiles[selectedFile] || ''}
                      modified={files[selectedFile] || ''}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: true,
                        renderSideBySide: true,
                      }}
                    />
                  ) : (
                    <Editor
                      height="100%"
                      language={getLanguage(selectedFile)}
                      theme="vs-dark"
                      value={files[selectedFile] || ''}
                      onChange={(value) => {
                        if (value !== undefined) {
                          onUpdateFiles({ ...files, [selectedFile]: value });
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        tabSize: 2,
                      }}
                    />
                  )}
                </div>
              </div>
            </Panel>

            {isTerminalVisible && (
              <>
                <PanelResizeHandle className="h-1 bg-[#252526] hover:bg-indigo-500 transition-colors cursor-row-resize" />
                <Panel defaultSize={30} minSize={10}>
                  <div className="h-full bg-black flex flex-col">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e1e] border-b border-[#3c3c3c]">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        Terminal
                      </div>
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-hidden p-2" />
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
