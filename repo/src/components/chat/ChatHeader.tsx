import React from 'react';
import { Folder, Wand2, Undo2, Redo2, Trash2, Settings } from 'lucide-react';
import type { Project } from '../../types';

interface ChatHeaderProps {
  currentProject: Project;
  onOpenProjects: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
}

export function ChatHeader({
  currentProject,
  onOpenProjects,
  onUndo,
  onRedo,
  onClearChat,
  onOpenSettings,
}: ChatHeaderProps) {
  return (
    <div className="p-3 border-b border-zinc-800 flex items-center justify-between overflow-hidden">
      <div className="flex items-center gap-1.5 font-semibold text-lg min-w-0">
        <button
          onClick={onOpenProjects}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100 shrink-0"
          title="Projects"
        >
          <Folder className="w-5 h-5" />
        </button>
        <Wand2 className="w-5 h-5 text-indigo-400 shrink-0" />
        <span className="truncate max-w-[80px] text-base" title={currentProject.name}>
          {currentProject.name}
        </span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onUndo}
          disabled={currentProject.historyIndex <= 0}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={currentProject.historyIndex >= currentProject.history.length - 1}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
        <button
          onClick={onClearChat}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-red-400"
          title="Clear Chat & Files"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
