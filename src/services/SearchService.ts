// SearchService.ts
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source?: string;
}

const SEARCH_TIMEOUT_MS = 10000;
const MAX_RESULTS_PER_SOURCE = 4;

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/',
];

export class SearchService {
  /**
   * Main entry point for web search.
   * Performs parallel searches on DuckDuckGo and Wikipedia for maximum speed.
   */
  static async searchWeb(query: string): Promise<string> {
    console.log(`[SearchService] Executing high-performance search for: "${query}"`);
    
    if (!query || query.trim() === '') {
      return this.formatError('Empty query provided.');
    }

    try {
      // Execute searches in parallel to minimize latency
      const [ddgResults, wikiResults] = await Promise.all([
        this.searchDuckDuckGo(query).catch(err => {
          console.error('[SearchService] DuckDuckGo failed:', err);
          return [] as SearchResult[];
        }),
        this.searchWikipedia(query).catch(err => {
          console.error('[SearchService] Wikipedia failed:', err);
          return [] as SearchResult[];
        })
      ]);

      const combinedResults = [...ddgResults, ...wikiResults];

      if (combinedResults.length > 0) {
        return this.formatResults(query, combinedResults);
      }

      return this.formatError(`No relevant results found for "${query}" on DuckDuckGo or Wikipedia.`);

    } catch (error: any) {
      console.error(`[SearchService] Fatal error:`, error);
      return this.formatError(`Search failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Scrapes DuckDuckGo HTML results using a rotating proxy strategy.
   */
  private static async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    // Try proxies in order
    for (const proxy of CORS_PROXIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

        const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const html = await response.text();
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
            
            // Clean DDG redirect links
            if (link.includes('uddg=')) {
              try {
                const urlObj = new URL('https://duckduckgo.com' + link);
                const uddg = urlObj.searchParams.get('uddg');
                if (uddg) link = decodeURIComponent(uddg);
              } catch (e) {
                // Fallback if URL parsing fails
                const match = link.match(/uddg=([^&]+)/);
                if (match && match[1]) link = decodeURIComponent(match[1]);
              }
            }

            const snippet = snippetEl.textContent?.trim() || '';
            
            if (title && link && snippet && !link.includes('duckduckgo.com/y.js')) {
              results.push({ title, link, snippet, source: 'DuckDuckGo' });
            }
          }
        });

        if (results.length > 0) {
          return results.slice(0, MAX_RESULTS_PER_SOURCE);
        }
      } catch (e) {
        console.warn(`[SearchService] Proxy ${proxy} failed for DDG, trying next...`);
        continue;
      }
    }
    return [];
  }

  /**
   * Fetches data from Wikipedia API.
   */
  private static async searchWikipedia(query: string): Promise<SearchResult[]> {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      
      if (data?.query?.search && data.query.search.length > 0) {
        return data.query.search.slice(0, MAX_RESULTS_PER_SOURCE).map((item: any) => ({
          title: item.title,
          link: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
          source: 'Wikipedia'
        }));
      }
    } catch (error) {
      console.error('[SearchService] Wikipedia API error:', error);
    }
    return [];
  }

  private static formatResults(query: string, results: SearchResult[]): string {
    let output = `\n--- LIVE WEB INTELLIGENCE: SEARCH RESULTS ---\n`;
    output += `Target Query: "${query}"\n`;
    output += `Generated At: ${new Date().toLocaleString()}\n\n`;

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
