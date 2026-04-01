// SearchService.ts
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source?: string;
}

const SEARCH_TIMEOUT_MS = 15000;
const MAX_RESULTS = 8;

const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://searx.tiekoetter.com',
  'https://search.mdosch.de',
  'https://searx.roflcopter.fr',
  'https://paulgo.io',
  'https://search.bus-hit.me',
  'https://searx.work',
  'https://searx.info',
  'https://searx.xyz',
  'https://search.disroot.org',
  'https://searx.mx',
  'https://searx.space'
];

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://cors-anywhere.herokuapp.com/',
  'https://proxy.cors.sh/',
  'https://api.codetabs.com/v1/proxy?quest=',
];

export class SearchService {
  static async searchWeb(query: string): Promise<string> {
    console.log(`[SearchService] Initiating search for: "${query}"`);
    
    if (!query || query.trim() === '') {
      return this.formatError('Empty query provided.');
    }

    try {
      // Strategy 1: Try SearXNG instances (best for general web search)
      const searxngResults = await this.trySearxngSearch(query);
      if (searxngResults && searxngResults.length > 0) {
        return this.formatResults(query, searxngResults, 'Web Search (SearXNG)');
      }

      // Strategy 2: Fallback to DuckDuckGo HTML via proxy
      console.log(`[SearchService] SearXNG failed. Trying DuckDuckGo HTML...`);
      const ddgResults = await this.searchDuckDuckGo(query);
      if (ddgResults && ddgResults.length > 0) {
        return this.formatResults(query, ddgResults, 'DuckDuckGo Search');
      }

      // Strategy 3: Fallback to Wikipedia (extremely reliable for factual queries)
      console.log(`[SearchService] DuckDuckGo failed. Falling back to Wikipedia.`);
      const wikiResults = await this.searchWikipedia(query);
      if (wikiResults && wikiResults.length > 0) {
        return this.formatResults(query, wikiResults, 'Wikipedia Search');
      }

      // If all fails
      return this.formatError(`No results found for "${query}" across all search providers.`);

    } catch (error: any) {
      console.error(`[SearchService] Fatal error during search:`, error);
      return this.formatError(`Search failed: ${error.message || 'Unknown error'}`);
    }
  }

  private static async trySearxngSearch(query: string): Promise<SearchResult[] | null> {
    const shuffledInstances = [...SEARXNG_INSTANCES].sort(() => Math.random() - 0.5);
    const shuffledProxies = [...CORS_PROXIES].sort(() => Math.random() - 0.5);

    for (const instance of shuffledInstances) {
      const targetUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=en`;

      try {
        const results = await this.fetchSearxng(targetUrl, true);
        if (results) return results;
        // Small delay before trying next instance
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        for (const proxy of shuffledProxies) {
          try {
            const proxiedUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
            const results = await this.fetchSearxng(proxiedUrl, false);
            if (results) return results;
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (proxyError) {
            continue;
          }
        }
      }
    }
    return null;
  }

  private static async fetchSearxng(url: string, isDirect: boolean): Promise<SearchResult[] | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(isDirect ? {} : { 'X-Requested-With': 'XMLHttpRequest' })
        }
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`[SearchService] Rate limited (429) for: ${url}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results
          .slice(0, MAX_RESULTS)
          .map((r: any) => ({
            title: r.title || 'Untitled',
            link: r.url || r.link || '',
            snippet: r.content || r.snippet || '',
            source: r.engine || 'Web'
          }))
          .filter((r: SearchResult) => r.snippet && r.link);
      }
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private static async searchDuckDuckGo(query: string): Promise<SearchResult[] | null> {
    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const response = await fetch(proxiedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const data = await response.json();
      const html = data.contents;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const results: SearchResult[] = [];
      
      const resultElements = doc.querySelectorAll('.result');
      resultElements.forEach((el) => {
        const titleEl = el.querySelector('.result__title .result__a');
        const snippetEl = el.querySelector('.result__snippet');
        
        if (titleEl && snippetEl) {
          const title = titleEl.textContent?.trim() || '';
          let link = titleEl.getAttribute('href') || '';
          if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
            const urlParam = new URLSearchParams(link.split('?')[1]).get('uddg');
            if (urlParam) link = decodeURIComponent(urlParam);
          }
          const snippet = snippetEl.textContent?.trim() || '';
          
          if (title && link && snippet) {
            results.push({ title, link, snippet, source: 'DuckDuckGo' });
          }
        }
      });
      
      return results.length > 0 ? results.slice(0, MAX_RESULTS) : null;
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('[SearchService] DuckDuckGo search failed:', e);
      return null;
    }
  }

  private static async searchWikipedia(query: string): Promise<SearchResult[] | null> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();
      
      if (data?.query?.search && data.query.search.length > 0) {
        return data.query.search.slice(0, MAX_RESULTS).map((item: any) => {
          const cleanSnippet = item.snippet.replace(/<\/?[^>]+(>|$)/g, "");
          return {
            title: item.title,
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: cleanSnippet,
            source: 'Wikipedia'
          };
        });
      }
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[SearchService] Wikipedia search failed:', error);
      return null;
    }
  }

  private static formatResults(query: string, results: SearchResult[], sourceName: string): string {
    let output = `\n--- LIVE INTELLIGENCE: WEB SEARCH RESULTS ---\n`;
    output += `Query: "${query}"\n`;
    output += `Source: ${sourceName}\n`;
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    results.forEach((r, i) => {
      output += `[${i + 1}] ${r.title}\n`;
      output += `URL: ${r.link}\n`;
      output += `Snippet: ${r.snippet}\n`;
      if (r.source) output += `Engine: ${r.source}\n`;
      output += `\n`;
    });

    output += `--- END SEARCH RESULTS ---\n`;
    output += `INSTRUCTIONS FOR AI: Use the above real-time information to answer the user's request accurately. If the information contradicts your training data, prioritize this live data.\n`;
    
    return output;
  }

  private static formatError(message: string): string {
    return `\n--- WEB SEARCH FAILED ---\nError: ${message}\nINSTRUCTIONS FOR AI: The web search failed. You must rely on your internal knowledge base to answer the user, but inform them that real-time search was unavailable.\n`;
  }
}
