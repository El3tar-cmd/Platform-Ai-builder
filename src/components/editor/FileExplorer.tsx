import React from 'react';
import { FileCode2 } from 'lucide-react';

interface FileExplorerProps {
  files: Record<string, string>;
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="p-3 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Files
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.keys(files).map((path) => (
          <button
            key={path}
            onClick={() => onSelectFile(path)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
              selectedFile === path
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{path}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
