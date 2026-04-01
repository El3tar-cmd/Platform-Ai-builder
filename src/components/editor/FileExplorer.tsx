import React, { useState, useRef, useEffect } from 'react';
import { FileCode2, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface FileExplorerProps {
  files: Record<string, string>;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileExplorerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (renamingFile && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingFile]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setIsCreating(false);
      setNewFileName('');
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingFile && renameValue.trim() && renameValue.trim() !== renamingFile) {
      onRenameFile(renamingFile, renameValue.trim());
    }
    setRenamingFile(null);
    setRenameValue('');
  };

  return (
    <div className="w-full h-full border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Files</span>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="New File"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/50 rounded-md">
            <FileCode2 className="w-4 h-4 shrink-0 text-zinc-500" />
            <input
              ref={createInputRef}
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.ext"
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewFileName('');
                }
              }}
              onBlur={() => {
                setIsCreating(false);
                setNewFileName('');
              }}
            />
          </form>
        )}

        {Object.keys(files).sort().map((path) => (
          <div
            key={path}
            className={`group w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              selectedFile === path
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {renamingFile === path ? (
              <form onSubmit={handleRenameSubmit} className="flex-1 flex items-center gap-2 min-w-0">
                <FileCode2 className="w-4 h-4 shrink-0" />
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-indigo-500/50 rounded px-1 outline-none text-sm text-zinc-200 min-w-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setRenamingFile(null);
                    }
                  }}
                  onBlur={handleRenameSubmit}
                />
              </form>
            ) : (
              <>
                <button
                  onClick={() => onSelectFile(path)}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                >
                  <FileCode2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{path}</span>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingFile(path);
                      setRenameValue(path);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${path}?`)) {
                        onDeleteFile(path);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
