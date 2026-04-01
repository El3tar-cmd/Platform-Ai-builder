import React from 'react';
import { Wand2 } from 'lucide-react';

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void;
}

export function EmptyState({ onPromptSelect }: EmptyStateProps) {
  return (
    <div className="text-center text-zinc-500 mt-10 space-y-3">
      <Wand2 className="w-8 h-8 mx-auto opacity-50" />
      <p className="text-sm">Describe the React app you want to build.</p>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <button
          onClick={() => onPromptSelect('A modern SaaS pricing page with 3 tiers')}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors"
        >
          Pricing Page
        </button>
        <button
          onClick={() => onPromptSelect('A sleek admin dashboard sidebar')}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-colors"
        >
          Admin Sidebar
        </button>
      </div>
    </div>
  );
}
