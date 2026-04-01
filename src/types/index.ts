export type { OllamaMessage } from '../lib/ollama';

export interface Attachment {
  url: string;
  base64: string;
  name?: string;
  type?: string;
  size?: number;
  isText?: boolean;
  textContent?: string;
}

export interface ProjectHistoryState {
  messages: import('../lib/ollama').OllamaMessage[];
  files: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  messages: import('../lib/ollama').OllamaMessage[];
  files: Record<string, string>;
  history: ProjectHistoryState[];
  historyIndex: number;
  updatedAt: number;
}

export type DeviceSize = 'desktop' | 'tablet' | 'mobile';
export type ActiveTab = 'preview' | 'code' | 'console';
