import { useState, useEffect, useCallback } from 'react';
import { SYSTEM_PROMPT } from '../constants/system-prompt';
import type { Project, OllamaMessage } from '../types';

/**
 * Manages the full project lifecycle: CRUD, history, undo/redo.
 * Persists projects and current selection to localStorage.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('stitch_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({
          ...p,
          history: p.history || [{ messages: p.messages, files: p.files }],
          historyIndex: p.historyIndex !== undefined ? p.historyIndex : 0,
        }));
      } catch (_e) {
        // Fall through to defaults
      }
    }

    // Migrate from legacy single-project state
    const legacyMessages = localStorage.getItem('stitch_messages');
    const legacyFiles = localStorage.getItem('stitch_files');
    if (legacyMessages || legacyFiles) {
      const msgs = legacyMessages
        ? JSON.parse(legacyMessages)
        : [{ role: 'system' as const, content: SYSTEM_PROMPT }];
      const fls = legacyFiles ? JSON.parse(legacyFiles) : {};
      return [
        {
          id: 'default',
          name: 'Project 1',
          messages: msgs,
          files: fls,
          history: [{ messages: msgs, files: fls }],
          historyIndex: 0,
          updatedAt: Date.now(),
        },
      ];
    }

    // Fresh start
    const initMsgs: OllamaMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    return [
      {
        id: 'default',
        name: 'Project 1',
        messages: initMsgs,
        files: {},
        history: [{ messages: initMsgs, files: {} }],
        historyIndex: 0,
        updatedAt: Date.now(),
      },
    ];
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(
    () => localStorage.getItem('stitch_current_project') || 'default'
  );

  // Derived state
  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0];
  const messages = currentProject.messages;
  const files = currentProject.files;

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('stitch_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('stitch_current_project', currentProjectId);
  }, [currentProjectId]);

  const updateCurrentProject = useCallback(
    (updates: Partial<Project>) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === currentProjectId ? { ...p, ...updates, updatedAt: Date.now() } : p
        )
      );
    },
    [currentProjectId]
  );

  const pushToHistory = useCallback(
    (newMessages: OllamaMessage[], newFiles: Record<string, string>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === currentProjectId) {
            const newHistory = p.history.slice(0, p.historyIndex + 1);
            newHistory.push({ messages: newMessages, files: newFiles });
            return {
              ...p,
              messages: newMessages,
              files: newFiles,
              history: newHistory,
              historyIndex: newHistory.length - 1,
              updatedAt: Date.now(),
            };
          }
          return p;
        })
      );
    },
    [currentProjectId]
  );

  const handleUndo = useCallback(() => {
    if (currentProject.historyIndex > 0) {
      const newIndex = currentProject.historyIndex - 1;
      const state = currentProject.history[newIndex];
      updateCurrentProject({
        messages: state.messages,
        files: state.files,
        historyIndex: newIndex,
      });
    }
  }, [currentProject, updateCurrentProject]);

  const handleRedo = useCallback(() => {
    if (currentProject.historyIndex < currentProject.history.length - 1) {
      const newIndex = currentProject.historyIndex + 1;
      const state = currentProject.history[newIndex];
      updateCurrentProject({
        messages: state.messages,
        files: state.files,
        historyIndex: newIndex,
      });
    }
  }, [currentProject, updateCurrentProject]);

  const createProject = useCallback(() => {
    const newId = Date.now().toString();
    const initMsgs: OllamaMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    const newProject: Project = {
      id: newId,
      name: `Project ${projects.length + 1}`,
      messages: initMsgs,
      files: {},
      history: [{ messages: initMsgs, files: {} }],
      historyIndex: 0,
      updatedAt: Date.now(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newId);
    return newId;
  }, [projects.length]);

  const switchProject = useCallback((id: string) => {
    setCurrentProjectId(id);
  }, []);

  const deleteProject = useCallback(
    (id: string): boolean => {
      if (projects.length === 1) {
        alert('You must have at least one project.');
        return false;
      }
      if (!window.confirm('Are you sure you want to delete this project?')) {
        return false;
      }
      setProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== id);
        if (id === currentProjectId) {
          setCurrentProjectId(filtered[0].id);
        }
        return filtered;
      });
      return true;
    },
    [projects.length, currentProjectId]
  );

  const clearChat = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the chat and all generated files for this project?')) {
      pushToHistory([{ role: 'system', content: SYSTEM_PROMPT }], {});
    }
  }, [pushToHistory]);

  return {
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
  };
}
