import { useState, useEffect, useCallback, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getWebContainerFiles } from '../utils/file-parser';
import type { ActiveTab, DeviceSize } from '../types';
import 'xterm/css/xterm.css';

interface UseWebContainerOptions {
  files: Record<string, string>;
  isGenerating: boolean;
}

let webcontainerInstance: WebContainer | null = null;

// Convert flat path map to WebContainer FileSystemTree
function buildFileSystemTree(files: Record<string, string>) {
  const tree: any = {};
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { file: { contents: content } };
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = current[part].directory;
      }
    }
  }
  return tree;
}

export function useWebContainer({ files, isGenerating }: UseWebContainerOptions) {
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isBooting, setIsBooting] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [isTerminalReady, setIsTerminalReady] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const devProcessRef = useRef<any>(null);
  const prevIsGenerating = useRef(isGenerating);

  // Initialize Terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme: { background: '#09090b', foreground: '#a1a1aa' },
      fontFamily: 'monospace',
      fontSize: 12,
      convertEol: true,
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    try {
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      setIsTerminalReady(true);
      term.writeln('\x1b[32m[System]\x1b[0m Terminal initialized.');
    } catch (e) {
      console.error("Failed to initialize terminal", e);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!terminalRef.current || terminalRef.current.offsetWidth === 0) return;
      
      requestAnimationFrame(() => {
        try { 
          if (xtermRef.current && xtermRef.current.element && fitAddonRef.current) {
            fitAddonRef.current.fit(); 
          }
        } catch (e) { }
      });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (e) { }
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      setIsTerminalReady(false);
    };
  }, [terminalRef.current]); // Re-run if ref element changes

  // Fit terminal when tab changes
  useEffect(() => {
    if (activeTab === 'console' && terminalRef.current && terminalRef.current.offsetWidth > 0) {
      // Small timeout to ensure DOM paints before fitting
      const timer = setTimeout(() => {
        try { 
          if (xtermRef.current && xtermRef.current.element && fitAddonRef.current) {
            fitAddonRef.current.fit(); 
          }
        } catch (e) { }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Boot WebContainer and run dev server
  const bootContainer = useCallback(async (initialFiles: Record<string, string>) => {
    if (!xtermRef.current) return;

    setIsBooting(true);
    try {
      if (!webcontainerInstance) {
        xtermRef.current?.writeln(`\x1b[34m[System]\x1b[0m Booting WebContainer micro-OS...`);
        webcontainerInstance = await WebContainer.boot();
        xtermRef.current?.writeln('\x1b[32m[System]\x1b[0m OS Booted successfully.');
      } else {
        xtermRef.current?.writeln('\x1b[34m[System]\x1b[0m Connecting to existing WebContainer...');
      }

      // Listen for server port
      webcontainerInstance.on('server-ready', (port, url) => {
        xtermRef.current?.writeln(`\x1b[32m[System]\x1b[0m Server ready at \x1b[36m${url}\x1b[0m`);
        setIframeUrl(url);
      });

      // Mount files
      const tree = buildFileSystemTree(getWebContainerFiles(initialFiles));
      xtermRef.current?.writeln(`\x1b[34m[System]\x1b[0m Mounting files...`);
      await webcontainerInstance.mount(tree);

      // Run npm install
      const packageJsonContent = initialFiles['package.json'] || '';
      const packageJsonHash = packageJsonContent.length.toString() + packageJsonContent.slice(0, 100);
      const cachedHash = localStorage.getItem('wc_package_json_hash');
      
      // Check if node_modules already exists
      let nodeModulesExists = false;
      try {
        await webcontainerInstance.fs.readdir('node_modules');
        nodeModulesExists = true;
      } catch (e) {}

      if (nodeModulesExists && cachedHash === packageJsonHash) {
        xtermRef.current?.writeln(`\x1b[34m[System]\x1b[0m Node modules already exist and package.json unchanged. Skipping install.`);
      } else {
        if (cachedHash === packageJsonHash) {
          xtermRef.current?.writeln(`\x1b[34m[System]\x1b[0m Package.json unchanged. Running fast install...`);
        } else {
          xtermRef.current?.writeln(`\x1b[34m[System]\x1b[0m New dependencies detected. Running \x1b[33mnpm install\x1b[0m...`);
        }

        const installProcess = await webcontainerInstance.spawn('npm', [
          'install',
          '--prefer-offline',
          '--no-audit',
          '--no-fund'
        ]);

        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            xtermRef.current?.write(data);
          }
        }));

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          xtermRef.current?.writeln(`\x1b[31m[System]\x1b[0m Installation failed with code ${installExitCode}`);
          return;
        }
      }

      localStorage.setItem('wc_package_json_hash', packageJsonHash);
      xtermRef.current?.writeln(`\x1b[32m[System]\x1b[0m Installation complete. Starting dev server...`);

      if (devProcessRef.current) {
        devProcessRef.current.kill();
      }

      const startProcess = await webcontainerInstance.spawn('npm', ['run', 'dev']);
      devProcessRef.current = startProcess;
      startProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            xtermRef.current?.write(data);
          }
        })
      );

    } catch (err: any) {
      xtermRef.current?.writeln(`\x1b[31m[System]\x1b[0m Error: ${err.message}`);
    } finally {
      setIsBooting(false);
    }
  }, []);

  // Update files quietly when not generating
  useEffect(() => {
    if (isGenerating && (!isAutoSync || isSafeMode)) return;

    // Auto-sync debounced
    const timer = setTimeout(async () => {
      if (webcontainerInstance) {
        const tree = buildFileSystemTree(getWebContainerFiles(files));
        try {
          await webcontainerInstance.mount(tree);
        } catch (e) {
          console.error("Failed to mount updated files", e);
        }
      }
    }, isGenerating ? 3000 : 500);

    return () => clearTimeout(timer);
  }, [files, isGenerating, isAutoSync, isSafeMode]);

  // Initial boot tracking
  const hasBooted = useRef(false);
  useEffect(() => {
    // Only boot if we have xterm initialized, so we don't swallow logs
    if (Object.keys(files).length > 0 && !hasBooted.current && !isGenerating && isTerminalReady) {
      hasBooted.current = true;
      bootContainer(files);
    }
  }, [files, isGenerating, bootContainer, isTerminalReady]);

  // Expose manual sync and reset
  const syncPreview = useCallback(async () => {
    if (webcontainerInstance) {
      const tree = buildFileSystemTree(getWebContainerFiles(files));
      await webcontainerInstance.mount(tree);
    }
  }, [files]);

  const resetViewer = useCallback(() => {
    hasBooted.current = false;
    setIframeUrl('');
    if (devProcessRef.current) {
      devProcessRef.current.kill();
      devProcessRef.current = null;
    }
    bootContainer(files);
  }, [bootContainer, files]);

  const installPackage = useCallback(async (pkg: string) => {
    if (!webcontainerInstance || !xtermRef.current) return;

    xtermRef.current.writeln(`\x1b[34m[System]\x1b[0m Installing package: \x1b[33m${pkg}\x1b[0m...`);
    const installProcess = await webcontainerInstance.spawn('npm', ['install', pkg]);
    
    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        xtermRef.current?.write(data);
      }
    }));

    const exitCode = await installProcess.exit;
    if (exitCode === 0) {
      xtermRef.current.writeln(`\x1b[32m[System]\x1b[0m Package \x1b[33m${pkg}\x1b[0m installed successfully.`);
      // Read back package.json to sync state
      const packageJson = await webcontainerInstance.fs.readFile('package.json', 'utf-8');
      return packageJson;
    } else {
      xtermRef.current.writeln(`\x1b[31m[System]\x1b[0m Failed to install \x1b[33m${pkg}\x1b[0m (exit code ${exitCode})`);
      return null;
    }
  }, []);

  const uninstallPackage = useCallback(async (pkg: string) => {
    if (!webcontainerInstance || !xtermRef.current) return;

    xtermRef.current.writeln(`\x1b[34m[System]\x1b[0m Uninstalling package: \x1b[33m${pkg}\x1b[0m...`);
    const uninstallProcess = await webcontainerInstance.spawn('npm', ['uninstall', pkg]);
    
    uninstallProcess.output.pipeTo(new WritableStream({
      write(data) {
        xtermRef.current?.write(data);
      }
    }));

    const exitCode = await uninstallProcess.exit;
    if (exitCode === 0) {
      xtermRef.current.writeln(`\x1b[32m[System]\x1b[0m Package \x1b[33m${pkg}\x1b[0m uninstalled successfully.`);
      // Read back package.json to sync state
      const packageJson = await webcontainerInstance.fs.readFile('package.json', 'utf-8');
      return packageJson;
    } else {
      xtermRef.current.writeln(`\x1b[31m[System]\x1b[0m Failed to uninstall \x1b[33m${pkg}\x1b[0m (exit code ${exitCode})`);
      return null;
    }
  }, []);

  const getIframeWidth = useCallback(() => {
    switch (deviceSize) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      case 'desktop':
        return 'w-full';
    }
  }, [deviceSize]);

  return {
    iframeUrl,
    isBooting,
    isSafeMode,
    setIsSafeMode,
    isAutoSync,
    setIsAutoSync,
    deviceSize,
    setDeviceSize,
    activeTab,
    setActiveTab,
    syncPreview,
    resetViewer,
    installPackage,
    uninstallPackage,
    getIframeWidth,
    terminalRef,
  };
}
