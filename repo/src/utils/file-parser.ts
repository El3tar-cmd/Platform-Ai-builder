import { DEFAULT_FILES } from '../constants/default-files';

/**
 * Parse <file path="...">...</file> and <edit file="..."> tags from AI-generated text.
 * Returns extracted new/patched files and cleaned text (without file/edit blocks).
 */
export function parseFilesFromStream(
  text: string,
  baselineFiles: Record<string, string> = {}
): {
  files: Record<string, string>;
  cleanText: string;
} {
  const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
  const editRegex = /<edit file="([^"]+)">([\s\S]*?)(?:<\/edit>|$)/g;
  const blockRegex = /<search>([\s\S]*?)<\/search>\s*<replace>([\s\S]*?)(?:<\/replace>|$)/g;

  let match;
  const files: Record<string, string> = {};
  let cleanText = text;

  // 1. Process standard <file> tags (entire file replacements or new files)
  while ((match = fileRegex.exec(text)) !== null) {
    files[match[1]] = match[2].trim();
    cleanText = cleanText.replace(match[0], '');
  }

  // 2. Process <edit> tags (semantic patching)
  while ((match = editRegex.exec(text)) !== null) {
    const filePath = match[1];
    const editContent = match[2];

    // Grab the baseline content or fall back to an earlier matched full-file replace
    let patchedContent = files[filePath] ?? baselineFiles[filePath] ?? '';
    let blockMatch;

    // Apply all <search>/<replace> blocks inside this edit tag
    while ((blockMatch = blockRegex.exec(editContent)) !== null) {
      const searchStr = blockMatch[1].trim(); 
      const replaceStr = blockMatch[2]; // Don't aggressively trim replace to preserve intentional newlines

      if (searchStr && patchedContent) {
        // Try strict inclusion first
        if (patchedContent.includes(searchStr)) {
          patchedContent = patchedContent.replace(searchStr, replaceStr);
        } else {
          // If strict matching fails (due to leading/trailing newlines or hallucinated whitespace by AI),
          // fallback to a slightly more normalized whitespace inclusion check.
          const normalizedSearch = searchStr.replace(/\r\n/g, '\n').trim();
          if (patchedContent.includes(normalizedSearch)) {
            patchedContent = patchedContent.replace(normalizedSearch, replaceStr);
          }
        }
      }
    }

    if (patchedContent) {
      files[filePath] = patchedContent;
    }
    
    cleanText = cleanText.replace(match[0], '');
  }

  return { files, cleanText: cleanText.trim() };
}

/**
 * Merge user files with default files and normalize for WebContainer consumption.
 * Handles alternative entry points, package.json normalization, etc.
 */
export function getWebContainerFiles(
  userFiles: Record<string, string>,
  defaultFiles: Record<string, string> = DEFAULT_FILES
): Record<string, string> {
  const merged: Record<string, string> = { ...defaultFiles, ...userFiles };

  // Handle public/index.html → root index.html
  if (merged['public/index.html']) {
    merged['index.html'] = merged['public/index.html'];
    delete merged['public/index.html'];
  }

  // Determine entry file
  const hasMainJsx = 'src/main.jsx' in userFiles;
  const hasMainTsx = 'src/main.tsx' in userFiles;
  const hasIndexJsx = 'src/index.jsx' in userFiles;
  const entryFile = hasMainTsx
    ? 'src/main.tsx'
    : hasMainJsx
      ? 'src/main.jsx'
      : hasIndexJsx
        ? 'src/index.jsx'
        : 'src/index.tsx';

  if (hasMainJsx || hasMainTsx || hasIndexJsx) {
    if (!('src/index.tsx' in userFiles)) {
      delete merged['src/index.tsx'];
    }
  }

  // Normalize package.json
  if (merged['package.json']) {
    try {
      const pkg = JSON.parse(merged['package.json']);
      pkg.type = 'module';

      pkg.dependencies = {
        ...pkg.dependencies,
        'react-router-dom': pkg.dependencies?.['react-router-dom'] || '^6.22.3',
        'lucide-react': pkg.dependencies?.['lucide-react'] || '^0.344.0',
        'framer-motion': pkg.dependencies?.['framer-motion'] || '^11.0.8',
        'clsx': pkg.devDependencies?.['clsx'] || pkg.dependencies?.['clsx'] || '^2.1.0',
        'tailwind-merge': pkg.devDependencies?.['tailwind-merge'] || pkg.dependencies?.['tailwind-merge'] || '^2.2.1',
        'zustand': pkg.dependencies?.['zustand'] || '^4.5.2',
        '@tanstack/react-query': pkg.dependencies?.['@tanstack/react-query'] || '^5.28.4',
        'react-hook-form': pkg.dependencies?.['react-hook-form'] || '^7.51.1',
        'zod': pkg.dependencies?.['zod'] || '^3.22.4',
        '@hookform/resolvers': pkg.dependencies?.['@hookform/resolvers'] || '^3.3.4',
      };

      pkg.devDependencies = {
        ...pkg.devDependencies,
        'tailwindcss': pkg.devDependencies?.['tailwindcss'] || '^3.4.1',
        'postcss': pkg.devDependencies?.['postcss'] || '^8.4.35',
        'autoprefixer': pkg.devDependencies?.['autoprefixer'] || '^10.4.18',
        'typescript': pkg.devDependencies?.['typescript'] || '^4.9.3',
        'vite': pkg.devDependencies?.['vite'] || '^5.2.0',
        '@vitejs/plugin-react': pkg.devDependencies?.['@vitejs/plugin-react'] || '^4.2.1',
      };

      // Determine if this is a Full-Stack app
      const hasNodeServer = 'server.js' in merged || 'server.ts' in merged || 'server/index.js' in merged || 'server/index.ts' in merged || 'api/index.js' in merged || 'api/index.ts' in merged;
      
      if (hasNodeServer) {
        const serverFile = 'server.ts' in merged ? 'server.ts' : 
                           'server.js' in merged ? 'server.js' : 
                           'server/index.ts' in merged ? 'server/index.ts' : 
                           'server/index.js' in merged ? 'server/index.js' : 
                           'api/index.ts' in merged ? 'api/index.ts' : 'api/index.js';
        
        pkg.scripts = {
          ...pkg.scripts,
          dev: `concurrently "vite" "tsx watch ${serverFile}"`
        };
        
        pkg.dependencies = {
          ...pkg.dependencies,
          'express': '^4.18.2',
          'cors': '^2.8.5',
          'helmet': '^7.1.0',
          'zod': '^3.22.4',
          'express-rate-limit': '^7.1.5',
          'drizzle-orm': '^0.29.3',
          '@libsql/client': '^0.4.3'
        };

        pkg.devDependencies = {
          ...pkg.devDependencies,
          'concurrently': '^8.2.2',
          'tsx': '^4.7.1',
          '@types/express': '^4.17.21',
          '@types/cors': '^2.8.17'
        };
      }

      merged['package.json'] = JSON.stringify(pkg, null, 2);
    } catch (e) {
      console.error('Failed to parse package.json', e);
    }
  } else {
    // Determine if this is a Full-Stack app manually generated
    const hasNodeServer = 'server.js' in merged || 'server.ts' in merged || 'server/index.js' in merged || 'server/index.ts' in merged || 'api/index.js' in merged || 'api/index.ts' in merged;
    const serverFile = 'server.ts' in merged ? 'server.ts' : 
                       'server.js' in merged ? 'server.js' : 
                       'server/index.ts' in merged ? 'server/index.ts' : 
                       'server/index.js' in merged ? 'server/index.js' : 
                       'api/index.ts' in merged ? 'api/index.ts' : 'api/index.js';

    merged['package.json'] = JSON.stringify(
      {
        name: 'react-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        main: entryFile,
        scripts: { 
          dev: hasNodeServer ? `concurrently "vite" "tsx watch ${serverFile}"` : 'vite', 
          build: 'tsc && vite build', 
          preview: 'vite preview' 
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'react-router-dom': '^6.22.3',
          'lucide-react': '^0.344.0',
          'framer-motion': '^11.0.8',
          'clsx': '^2.1.0',
          'tailwind-merge': '^2.2.1',
          'zustand': '^4.5.2',
          '@tanstack/react-query': '^5.28.4',
          'react-hook-form': '^7.51.1',
          'zod': '^3.22.4',
          '@hookform/resolvers': '^3.3.4',
          ...(hasNodeServer ? {
            'express': '^4.18.2',
            'cors': '^2.8.5',
            'helmet': '^7.1.0',
            'express-rate-limit': '^7.1.5',
            'drizzle-orm': '^0.29.3',
            '@libsql/client': '^0.4.3'
          } : {})
        },
        devDependencies: {
          'tailwindcss': '^3.4.1',
          'postcss': '^8.4.35',
          'autoprefixer': '^10.4.18',
          'typescript': '^4.9.3',
          'vite': '^5.2.0',
          '@vitejs/plugin-react': '^4.2.1',
          ...(hasNodeServer ? { 
            'concurrently': '^8.2.2', 
            'tsx': '^4.7.1',
            '@types/express': '^4.17.21',
            '@types/cors': '^2.8.17'
          } : {})
        },
      },
      null,
      2
    );
  }

  // Fix script tags and inject Click-to-Edit bridge in index.html
  if (merged['index.html']) {
    // 1. Inject the Click-to-Edit Bridge Script
    const clickToEditScript = `
    <script>
      window.addEventListener('click', (e) => {
        if (e.altKey) { // Alt+Click triggers the inspector
          e.preventDefault();
          e.stopPropagation();
          const target = e.target;
          window.parent.postMessage({
            type: 'CLICK_TO_EDIT',
            tagName: target.tagName.toLowerCase(),
            className: target.className,
            text: target.innerText ? target.innerText.substring(0, 60) : '',
            id: target.id
          }, '*');
          
          // Visual feedback
          const originalOutline = target.style.outline;
          target.style.outline = '3px solid #6366f1';
          target.style.transition = 'outline 0.3s ease';
          setTimeout(() => { target.style.outline = originalOutline; }, 500);
        }
      }, { capture: true });
    </script>
    `;
    merged['index.html'] = merged['index.html'].replace('</body>', `${clickToEditScript}\n  </body>`);

    // 2. Fix the entry point script
    if (merged['index.html'].match(/<script[^>]*src="\/src\/[^"]+"[^>]*><\/script>/)) {
      merged['index.html'] = merged['index.html'].replace(
        /<script[^>]*src="\/src\/[^"]+"[^>]*><\/script>/,
        `<script type="module" src="/${entryFile}"></script>`
      );
    } else if (!merged['index.html'].includes('src/')) {
      merged['index.html'] = merged['index.html'].replace(
        '</body>',
        `  <script type="module" src="/${entryFile}"></script>\n  </body>`
      );
    }
  }

  // Handle App.jsx → App.tsx
  if ('src/App.jsx' in userFiles && !('src/App.tsx' in userFiles)) {
    delete merged['src/App.tsx'];
  }

  // Ensure vite config exists
  if (!merged['vite.config.ts'] && !merged['vite.config.js']) {
    merged['vite.config.ts'] = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});`;
  }

  return merged;
}
