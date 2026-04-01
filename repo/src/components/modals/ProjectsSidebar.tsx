import React from 'react';
import { Folder, X, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string;
  onCreateProject: () => void;
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
}

export function ProjectsSidebar({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onCreateProject,
  onSwitchProject,
  onDeleteProject,
}: ProjectsSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex z-50">
      <div className="bg-zinc-900 border-r border-zinc-800 w-80 h-full flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-400" /> Projects
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={onCreateProject}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                project.id === currentProjectId
                  ? 'bg-indigo-500/10 border border-indigo-500/20'
                  : 'hover:bg-zinc-800 border border-transparent'
              }`}
              onClick={() => onSwitchProject(project.id)}
            >
              <div className="flex flex-col overflow-hidden">
                <span
                  className={`text-sm font-medium truncate ${
                    project.id === currentProjectId ? 'text-indigo-400' : 'text-zinc-200'
                  }`}
                >
                  {project.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(project.updatedAt).toLocaleDateString()}{' '}
                  {new Date(project.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <button
                onClick={(e) => onDeleteProject(project.id, e)}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
