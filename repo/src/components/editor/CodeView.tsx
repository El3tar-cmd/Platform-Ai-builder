import React, { useState } from 'react';
import { FileCode2, GitCompare, Save } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { FileExplorer } from './FileExplorer';
import type { Project, OllamaMessage } from '../../types';

interface CodeViewProps {
  files: Record<string, string>;
  currentProject: Project;
  messages: OllamaMessage[];
  onUpdateFiles: (files: Record<string, string>) => void;
  onSaveToHistory: () => void;
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
}: CodeViewProps) {
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [isDiffView, setIsDiffView] = useState(false);

  const previousFiles =
    currentProject.historyIndex > 0
      ? currentProject.history[currentProject.historyIndex - 1].files
      : {};

  return (
    <div className="w-full h-full flex bg-[#1e1e1e] rounded-lg border border-zinc-800 overflow-hidden">
      <FileExplorer files={files} selectedFile={selectedFile} onSelectFile={setSelectedFile} />

      <div className="flex-1 overflow-hidden flex flex-col bg-[#1e1e1e]">
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
    </div>
  );
}
