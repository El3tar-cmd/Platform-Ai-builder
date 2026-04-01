import React, { RefObject } from 'react';
import { Loader2, Terminal as TerminalIcon } from 'lucide-react';
import type { ActiveTab } from '../../types';

interface PreviewPanelProps {
  activeTab: ActiveTab;
  isSafeMode: boolean;
  isGenerating: boolean;
  iframeWidth: string;
  iframeUrl: string;
  isBooting: boolean;
  terminalRef: RefObject<HTMLDivElement | null>;
}

export function PreviewPanel({
  activeTab,
  isSafeMode,
  isGenerating,
  iframeWidth,
  iframeUrl,
  isBooting,
  terminalRef,
}: PreviewPanelProps) {
  return (
    <div
      className={`h-full transition-all duration-300 ease-in-out ${iframeWidth} bg-white rounded-lg shadow-2xl overflow-hidden border border-zinc-800 flex flex-col`}
    >
      {/* Browser Chrome */}
      <div className="h-8 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        </div>
        <div className="flex items-center gap-2">
          {(isGenerating || isBooting) && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            DevHive Engine
          </span>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        {isSafeMode && isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 p-8 text-center z-10">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-amber-500" />
            <h3 className="text-lg font-bold text-zinc-200 mb-2">Safe Mode Active</h3>
            <p className="text-sm max-w-xs">
              Preview is paused while generating to ensure system stability. It will resume
              once generation is complete.
            </p>
          </div>
        ) : null}

        {/* Tab content is always rendered but hidden using opacity/z-index so the terminal doesn't unmount or lose dimensions */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${
          activeTab === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              title="Preview"
              className="w-full h-full border-0 bg-white"
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 p-6 text-center">
              {isGenerating && !isBooting ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-400" />
                  <p className="font-medium text-zinc-300">Waiting for files...</p>
                  <p className="text-xs text-zinc-500 mt-2 max-w-xs">
                    The virtual OS will boot up after the initial code generation is complete.
                  </p>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
                  <p className="font-medium text-zinc-300">Starting development server...</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Installing packages and booting the server.
                    <br />
                    Check the <strong>Console</strong> tab for live progress!
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`absolute inset-0 w-full h-full flex flex-col bg-black transition-opacity duration-200 ${
          activeTab === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          <div className="p-2 border-b border-zinc-800 bg-zinc-900 flex items-center gap-2 shrink-0">
            <TerminalIcon className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-mono uppercase">
              System Logs
            </span>
          </div>
          <div ref={terminalRef as any} className="flex-1 overflow-hidden p-2" />
        </div>
      </div>
    </div>
  );
}
