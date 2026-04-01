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
        patchedContent = fuzzyReplace(patchedContent, searchStr, replaceStr);
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
 * Attempts to replace a search string in content, falling back to flexible whitespace matching if exact match fails.
 */
function fuzzyReplace(content: string, search: string, replace: string): string {
  // 1. Try exact match
  if (content.includes(search)) {
    return content.replace(search, replace);
  }

  // 2. Try normalized newlines and trimmed
  const normalizedSearch = search.replace(/\r\n/g, '\n').trim();
  if (content.includes(normalizedSearch)) {
    return content.replace(normalizedSearch, replace);
  }

  // 3. Try flexible whitespace matching
  try {
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleSearchRegex = new RegExp(escapedSearch.replace(/\s+/g, '\\s+'), 'g');
    
    const match = flexibleSearchRegex.exec(content);
    if (match) {
      return content.substring(0, match.index) + replace + content.substring(match.index + match[0].length);
    }
  } catch (e) {
    console.warn('[FileParser] Regex creation failed for fuzzy replace', e);
  }

  // 4. If all fails, return original content
  console.warn(`[FileParser] Failed to apply patch. Search block not found.`);
  return content;
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

  // Fix script tags and inject Sandbox Observer in index.html
  if (merged['index.html']) {
    // 1. Inject the Sandbox Observer Script (Click-to-Edit, Error Tracking, DOM Snapshot)
    const sandboxObserverScript = `
    <script>
      // A. Click-to-Edit Bridge
      window.addEventListener('click', (e) => {
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const target = e.target;
          window.parent.postMessage({
            type: 'CLICK_TO_EDIT',
            tagName: target.tagName.toLowerCase(),
            className: typeof target.className === 'string' ? target.className : (target.className?.baseVal || ''),
            text: target.innerText ? target.innerText.substring(0, 60) : '',
            id: target.id
          }, '*');
          
          const originalOutline = target.style.outline;
          target.style.outline = '3px solid #6366f1';
          target.style.transition = 'outline 0.3s ease';
          setTimeout(() => { target.style.outline = originalOutline; }, 500);
        }
      }, { capture: true });

      // B. Runtime Error Observer (The AI's "Pain Receptors")
      const sendErrorToAgent = (source, msg, file, line) => {
        window.parent.postMessage({
          type: 'RUNTIME_ERROR',
          payload: \`[Sandbox Error] \${source}: \${msg} \${file ? 'at '+file+':'+line : ''}\`
        }, '*');
      };

      window.addEventListener('error', (e) => sendErrorToAgent('Window', e.message, e.filename, e.lineno));
      window.addEventListener('unhandledrejection', (e) => sendErrorToAgent('Promise', e.reason?.message || e.reason));
      
      const origError = console.error;
      console.error = function(...args) {
        origError.apply(console, args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (!msg.includes('Warning:')) { // Filter out React warnings to avoid spam
          sendErrorToAgent('Console', msg);
        }
      };

      // C. DOM Snapshot (The AI's "Eyes")
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'REQUEST_DOM_SNAPSHOT') {
          const clone = document.documentElement.cloneNode(true);
          // Remove noisy elements to save tokens
          clone.querySelectorAll('script, style, link, meta, noscript').forEach(el => el.remove());
          
          // Simplify classes to reduce size
          const html = clone.innerHTML.replace(/ class="([^"]*)"/g, (match, classes) => {
            const clean = classes.split(' ').filter(c => !c.startsWith('hover:') && !c.startsWith('focus:') && !c.startsWith('sm:') && !c.startsWith('md:') && !c.startsWith('lg:') && !c.startsWith('transition')).join(' ');
            return clean ? \` class="\${clean}"\` : '';
          });

          window.parent.postMessage({
            type: 'DOM_SNAPSHOT',
            payload: html.substring(0, 8000) // Limit size
          }, '*');
        }
      });
    </script>
    `;
    merged['index.html'] = merged['index.html'].replace('</body>', `${sandboxObserverScript}\n  </body>`);

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
