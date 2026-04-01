// SearchService.ts
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source?: string;
}

const SEARCH_TIMEOUT_MS = 8000;
const MAX_RESULTS_PER_SOURCE = 5;

// Highly reliable CORS proxies
const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

export class SearchService {
  /**
   * Performs a high-performance web search across multiple sources in parallel.
   * Uses optimized proxy rotation for maximum reliability.
   */
  static async searchWeb(query: string): Promise<string> {
    console.log(`[SearchService] Executing optimized search for: "${query}"`);
    
    if (!query || query.trim() === '') {
      return this.formatError('Empty query provided.');
    }

    try {
      // Execute searches in parallel
      const [ddgResults, wikiResults] = await Promise.all([
        this.searchDuckDuckGo(query).catch(err => {
          console.warn('[SearchService] DuckDuckGo failed:', err);
          return [] as SearchResult[];
        }),
        this.searchWikipedia(query).catch(err => {
          console.warn('[SearchService] Wikipedia failed:', err);
          return [] as SearchResult[];
        })
      ]);

      const combinedResults = [...ddgResults, ...wikiResults];

      if (combinedResults.length > 0) {
        return this.formatResults(query, combinedResults);
      }

      return this.formatError(`No relevant results found for "${query}".`);

    } catch (error: any) {
      console.error(`[SearchService] Fatal error:`, error);
      return this.formatError(`Search failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Scrapes DuckDuckGo HTML results using parallel proxy attempts for maximum speed.
   */
  private static async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    // Create a promise for each proxy
    const proxyPromises = CORS_PROXIES.map(async (proxy) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

        const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const html = await response.text();
        if (!html || html.length < 1000) throw new Error('Insufficient content');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results: SearchResult[] = [];
        
        const resultElements = doc.querySelectorAll('.result');
        if (resultElements.length === 0) throw new Error('No results in HTML');

        resultElements.forEach((el) => {
          const titleEl = el.querySelector('.result__title .result__a');
          const snippetEl = el.querySelector('.result__snippet');
          
          if (titleEl && snippetEl) {
            const title = titleEl.textContent?.trim() || '';
            let link = titleEl.getAttribute('href') || '';
            
            if (link.includes('uddg=')) {
              try {
                const uddg = new URLSearchParams(link.split('?')[1]).get('uddg');
                if (uddg) link = decodeURIComponent(uddg);
              } catch (e) {
                const match = link.match(/uddg=([^&]+)/);
                if (match && match[1]) link = decodeURIComponent(match[1]);
              }
            }

            const snippet = snippetEl.textContent?.trim() || '';
            if (title && link && snippet && !link.includes('duckduckgo.com')) {
              results.push({ title, link, snippet, source: 'DuckDuckGo' });
            }
          }
        });

        if (results.length === 0) throw new Error('No valid results found');
        return results.slice(0, MAX_RESULTS_PER_SOURCE);
      } catch (e) {
        throw e;
      }
    });

    try {
      // Use any() to get the first successful proxy response
      // We use a custom implementation of any() that ignores errors unless all fail
      return await this.promiseAny(proxyPromises);
    } catch (e) {
      console.warn('[SearchService] All DuckDuckGo proxies failed');
      return [];
    }
  }

  /**
   * Custom promiseAny that returns the first successful result, or throws if all fail.
   */
  private static async promiseAny<T>(promises: Promise<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
      let errors: any[] = [];
      let finished = 0;
      promises.forEach(p => {
        p.then(resolve).catch(err => {
          errors.push(err);
          finished++;
          if (finished === promises.length) {
            reject(new Error('All proxies failed'));
          }
        });
      });
    });
  }

  /**
   * Fetches data from Wikipedia API (English and Arabic for better coverage).
   */
  private static async searchWikipedia(query: string): Promise<SearchResult[]> {
    const languages = ['en', 'ar'];
    const results: SearchResult[] = [];

    await Promise.all(languages.map(async (lang) => {
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const data = await response.json();
        if (data?.query?.search) {
          const langResults = data.query.search.slice(0, 3).map((item: any) => ({
            title: item.title,
            link: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
            source: `Wikipedia (${lang.toUpperCase()})`
          }));
          results.push(...langResults);
        }
      } catch (e) {
        console.warn(`[SearchService] Wikipedia (${lang}) failed:`, e);
      }
    }));

    return results;
  }

  private static formatResults(query: string, results: SearchResult[]): string {
    let output = `\n--- LIVE WEB INTELLIGENCE: SEARCH RESULTS ---\n`;
    output += `Query: "${query}"\n`;
    output += `Timestamp: ${new Date().toLocaleString()}\n\n`;

    results.forEach((r, i) => {
      output += `[RESULT ${i + 1}]\n`;
      output += `TITLE: ${r.title}\n`;
      output += `SOURCE: ${r.source}\n`;
      output += `URL: ${r.link}\n`;
      output += `SUMMARY: ${r.snippet}\n\n`;
    });

    output += `--- END OF SEARCH DATA ---\n`;
    output += `INSTRUCTIONS: Use the real-time data above to provide an accurate, up-to-date response. If the data contradicts your internal knowledge, prioritize the search results.\n`;
    
    return output;
  }

  private static formatError(message: string): string {
    return `\n--- WEB SEARCH UNAVAILABLE ---\nReason: ${message}\nINSTRUCTIONS: Proceed using your internal knowledge base, but mention that live search was unsuccessful.\n`;
  }
}
